from cryptography.fernet import Fernet, InvalidToken

class EncryptionService:
    def __init__(self, key: str):
        if not key:
            raise ValueError("ENCRYPTION_KEY is not set in environment variables.")
        self.fernet = Fernet(key.encode('utf-8'))

    def encrypt(self, plain_text: str) -> str:
        if not plain_text:
            return plain_text
        return self.fernet.encrypt(plain_text.encode('utf-8')).decode('utf-8')

    def decrypt(self, encrypted_text: str) -> str:
        if not encrypted_text:
            return encrypted_text
        try:
            return self.fernet.decrypt(encrypted_text.encode('utf-8')).decode('utf-8')
        except InvalidToken:
            return encrypted_text

def get_encryption_service(key: str) -> EncryptionService:
    return EncryptionService(key)
