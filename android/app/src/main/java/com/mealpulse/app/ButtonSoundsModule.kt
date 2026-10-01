package com.mealpulse.app

import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** Decoded short samples, independent of the TTS player's audio mode and focus. */
class ButtonSoundsModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val handler = Handler(Looper.getMainLooper())
  private var pool: SoundPool? = null
  private var enabled = true
  private var playbackEpoch = 0
  private val samples = mutableMapOf<String, Int>()
  private val loading = mutableMapOf<Int, PendingLoad>()
  private val streams = ArrayDeque<Int>()

  private data class PendingLoad(val kind: String, val promises: MutableList<Promise>, val timeout: Runnable)

  override fun getName() = "MealPulseButtonSounds"

  private fun ensurePool(): SoundPool {
    pool?.let { return it }
    val created = SoundPool.Builder()
      .setMaxStreams(8)
      .setAudioAttributes(AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build())
      .build()
    created.setOnLoadCompleteListener { completedPool, sampleId, status ->
      handler.post {
        if (pool !== completedPool) return@post
        val pending = loading.remove(sampleId) ?: return@post
        handler.removeCallbacks(pending.timeout)
        if (status == 0) {
          samples[pending.kind] = sampleId
          pending.promises.forEach { it.resolve(null) }
        } else {
          completedPool.unload(sampleId)
          pending.promises.forEach { it.reject("E_SOUND_LOAD", "Cannot decode ${pending.kind}: $status") }
        }
      }
    }
    pool = created
    return created
  }

  @ReactMethod
  fun load(kind: String, resourceName: String, promise: Promise) {
    handler.post {
      if (samples.containsKey(kind)) {
        promise.resolve(null)
        return@post
      }
      loading.values.firstOrNull { it.kind == kind }?.let {
        it.promises.add(promise)
        return@post
      }
      // Metro packages statically required WAVs into raw resources in release builds.
      val resource = context.resources.getIdentifier(resourceName, "raw", context.packageName)
      if (resource == 0) {
        promise.reject("E_SOUND_RESOURCE_MISSING", "Missing bundled sound: $resourceName")
        return@post
      }
      try {
        val current = ensurePool()
        val sampleId = current.load(context, resource, 1)
        if (sampleId == 0) {
          promise.reject("E_SOUND_LOAD", "Cannot load $kind")
          return@post
        }
        val timeout = Runnable {
          if (pool !== current) return@Runnable
          val pending = loading.remove(sampleId) ?: return@Runnable
          current.unload(sampleId)
          pending.promises.forEach { it.reject("E_SOUND_LOAD_TIMEOUT", "Loading $kind timed out") }
        }
        loading[sampleId] = PendingLoad(kind, mutableListOf(promise), timeout)
        handler.postDelayed(timeout, 3_000)
      } catch (error: Exception) {
        promise.reject("E_SOUND_LOAD", error)
      }
    }
  }

  @ReactMethod
  fun play(kind: String, volume: Double, promise: Promise) {
    handler.post {
      if (!enabled) {
        promise.resolve(null)
        return@post
      }
      val current = pool
      val sampleId = samples[kind]
      if (current == null || sampleId == null) {
        promise.reject("E_SOUND_NOT_READY", "Sound $kind is not loaded")
        return@post
      }
      val epoch = playbackEpoch
      val level = volume.toFloat().coerceIn(0f, 1f)
      fun start(retry: Boolean) {
        if (!enabled || pool !== current || epoch != playbackEpoch) {
          promise.resolve(null)
          return
        }
        try {
          val stream = current.play(sampleId, level, level, 1, 0, 1f)
          if (stream != 0) {
            streams.addLast(stream)
            // Short UI samples. Keep only recent IDs for mute cleanup.
            while (streams.size > 64) streams.removeFirst()
            promise.resolve(null)
          } else if (retry) {
            handler.postDelayed({ start(false) }, 16)
          } else {
            promise.reject("E_SOUND_PLAY", "Cannot start sound $kind")
          }
        } catch (error: Exception) {
          promise.reject("E_SOUND_PLAY", error)
        }
      }
      start(true)
    }
  }

  @ReactMethod
  fun unload(kind: String) {
    handler.post {
      samples.remove(kind)?.let { pool?.unload(it) }
    }
  }

  @ReactMethod
  fun setEnabled(value: Boolean) {
    handler.post {
      enabled = value
      if (!value) {
        playbackEpoch++
        streams.forEach { pool?.stop(it) }
        streams.clear()
      }
    }
  }

  private fun dispose() {
    playbackEpoch++
    loading.values.forEach { pending ->
      handler.removeCallbacks(pending.timeout)
      pending.promises.forEach { it.reject("E_SOUND_RELEASED", "Sound player released") }
    }
    loading.clear()
    samples.clear()
    streams.clear()
    pool?.release()
    pool = null
  }

  @ReactMethod
  fun release() {
    handler.post { dispose() }
  }

  override fun invalidate() {
    handler.post { dispose() }
    super.invalidate()
  }
}
