from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from mlx_tts_engine import normalize_speech_text, prepare_pronunciation


class PronunciationTests(unittest.TestCase):
    def test_calories_and_protein_are_spoken_as_exact_values(self):
        self.assertEqual(prepare_pronunciation('2000 kcal e 140g di proteine.', 'it'),
                         'duemila calorie e centoquaranta grammi di proteine.')

    def test_decimal_grouping_and_negative_values(self):
        self.assertEqual(prepare_pronunciation('1.000 calorie, 1,5 g e -300 kcal.', 'it'),
                         'mille calorie, uno virgola cinque grammi e meno trecento calorie.')

    def test_brand_names_and_neapolitan_apostrophes_are_preserved(self):
        self.assertEqual(prepare_pronunciation("Nun vevere 7Up, jamme cu 'o bicchiere!", 'it'),
                         "Nun vevere 7Up, jamme cu 'o bicchiere!")
        self.assertEqual(normalize_speech_text("'O piatto... Jamme!..."), "'O piatto. Jamme!")

    def test_invalid_decimal_and_unsupported_number_language_dont_crash(self):
        self.assertEqual(prepare_pronunciation('Versione 1.2.3.', 'it'), 'Versione 1.2.3.')
        self.assertEqual(prepare_pronunciation('140 グラム', 'ja'), '140 グラム')


if __name__ == '__main__':
    unittest.main()
