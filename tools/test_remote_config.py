#!/usr/bin/env python3
"""
Test deterministic verification of Supabase Dynamic Remote Config for MealPulse TTS.
"""
import urllib.request
import json
import os

SUPABASE_URL = "https://bjnqebnaboxufnxkngjb.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqbnFlYm5hYm94dWZueGtuZ2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMzA0NjMsImV4cCI6MjEwMDgwNjQ2M30.UmzVcEv8KnGS70iKvUa0CCTpMMdWdO2WWI6GQVb1oiQ"

def test_supabase_remote_config():
    print("--- 1. Testing Supabase Remote Config Fetch ---")
    url = f"{SUPABASE_URL}/rest/v1/app_config?key=eq.tts_api_url&select=value"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    })
    
    with urllib.request.urlopen(req, timeout=5) as response:
        assert response.status == 200, f"Failed with status {response.status}"
        data = json.loads(response.read().decode('utf-8'))
        print(f"Supabase response: {data}")
        assert len(data) > 0, "No records returned"
        tts_url = data[0]['value']
        print(f"Retrieved TTS URL: {tts_url}")
        
    print("\n--- 2. Testing Target TTS Endpoint Health ---")
    health_url = f"{tts_url}/health"
    req_health = urllib.request.Request(health_url)
    with urllib.request.urlopen(req_health, timeout=5) as response:
        assert response.status == 200, f"Target health failed: {response.status}"
        health_data = json.loads(response.read().decode('utf-8'))
        print(f"Target TTS Health Response: {health_data}")
        assert health_data.get("status") == "ok", "Status is not ok"
        voices = health_data.get("voices_available", [])
        assert "napoletano" in voices or "zio_italiano" in voices, "Zio Napoletano missing"
        print("  ✓ Supabase remote config URL is reachable and XTTS service is healthy!")
        
    print("\n>>> ALL TESTS PASSED: Supabase Dynamic Config is live, verified, and operational! <<<")

if __name__ == "__main__":
    test_supabase_remote_config()
