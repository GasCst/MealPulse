import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

import httpx
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tts_dialect import DialectAdapter, valid_rewrite


class DialectTests(unittest.TestCase):
    def test_short_dialectal_introduction_is_accepted(self):
        self.assertTrue(valid_rewrite('Ciao! Questa è la mia voce.', "Uè! Chesta è 'a voce mia."))
        self.assertFalse(valid_rewrite('Ciao! Questa è la mia voce.', 'Ciao! Questa è la mia voce.'))

    def test_numbers_are_never_added_dropped_or_changed(self):
        original = 'Oggi hai 2000 calorie e 140 grammi di proteine.'
        self.assertTrue(valid_rewrite(original, "Oje tiene 2000 calorie e 140 grammi 'e proteine. Jamme!"))
        self.assertFalse(valid_rewrite(original, "Oje tiene 1800 calorie e 140 grammi 'e proteine. Jamme!"))
        self.assertFalse(valid_rewrite(original, "Oje tiene 2000 calorie. Jamme!"))
        self.assertFalse(valid_rewrite(original, "Oje tiene 2000 calorie e 140 grammi 'e proteine. Jamme pe 5 juorne!"))

    def test_already_dialectal_text_and_other_voices_skip_network(self):
        adapter = DialectAdapter()
        with patch.object(adapter.client, 'post') as post:
            text = "Jamme, guagliò! Nun te scurdà 'e vevere."
            self.assertEqual(adapter.adapt(text, 'napoletano', 'it'), (text, 'native'))
            self.assertEqual(adapter.adapt('Hello!', 'napoletano', 'en'), ('Hello!', 'not_requested'))
            self.assertEqual(adapter.adapt('Buongiorno!', 'sara', 'it'), ('Buongiorno!', 'not_requested'))
            post.assert_not_called()
        adapter.close()

    def test_successful_rewrite_is_cached_and_failures_retain_input(self):
        with patch.dict(os.environ, {'TTS_DIALECT_REWRITE': '1', 'GEMINI_API_KEY': 'test'}):
            adapter = DialectAdapter()
        original = 'Oggi hai 2000 calorie.'
        rewritten = 'Oje tiene 2000 calorie. Jamme!'
        response = httpx.Response(200, request=httpx.Request('POST', 'https://example.com'), json={
            'candidates': [{'content': {'parts': [{'text': '{"text": "' + rewritten + '"}'}]}}],
        })
        with patch.object(adapter.client, 'post', return_value=response) as post:
            self.assertEqual(adapter.adapt(original, 'napoletano', 'it'), (rewritten, 'rewritten'))
            self.assertEqual(adapter.adapt(original, 'napoletano', 'it'), (rewritten, 'rewritten'))
            self.assertEqual(post.call_count, 1)
        with patch.object(adapter.client, 'post', side_effect=httpx.ReadTimeout('timeout')):
            other = 'Oggi hai 1800 calorie.'
            self.assertEqual(adapter.adapt(other, 'napoletano', 'it'), (other, 'unavailable'))
        adapter.close()


if __name__ == '__main__':
    unittest.main()
