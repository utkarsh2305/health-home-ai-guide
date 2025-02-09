class DefaultLetters:
    @staticmethod
    def get_default_letter_templates():
        return [
            (1, 'GP Letter', 'Write a brief letter to the patient\'s general practitioner...'),
            (2, 'Specialist Referral', 'Write a detailed referral letter...'),
            (3, 'Discharge Summary', 'Write a comprehensive discharge summary...'),
            (4, 'Brief Update', 'Write a short update letter...')
        ]
