import json
import os
import re
import webbrowser

import pyperclip
import pyttsx3
import speech_recognition as sr
from dotenv import load_dotenv
from openai import OpenAI
from twilio.rest import Client as TwilioClient


class JarvisAssistant:
    def __init__(self) -> None:
        load_dotenv()

        self.wake_word = "jarvis"
        self.tts = pyttsx3.init()
        self.recognizer = sr.Recognizer()

        openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.openai = OpenAI(api_key=openai_api_key) if openai_api_key else None

        self.twilio = self._build_twilio_client()
        self.twilio_from_number = os.getenv("TWILIO_FROM_NUMBER", "")
        self.contacts = self._load_contacts()

    def _build_twilio_client(self):
        sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        token = os.getenv("TWILIO_AUTH_TOKEN", "")
        if sid and token:
            return TwilioClient(sid, token)
        return None

    def _load_contacts(self) -> dict:
        raw = os.getenv("CONTACTS_JSON", "{}")
        try:
            parsed = json.loads(raw)
            return {k.lower(): v for k, v in parsed.items()}
        except json.JSONDecodeError:
            return {}

    def speak(self, text: str) -> None:
        print(f"Jarvis: {text}")
        self.tts.say(text)
        self.tts.runAndWait()

    def listen_once(self) -> str:
        with sr.Microphone() as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=0.4)
            audio = self.recognizer.listen(source)

        try:
            return self.recognizer.recognize_google(audio).strip().lower()
        except sr.UnknownValueError:
            return ""
        except sr.RequestError:
            return "speech_service_unavailable"

    def send_sms(self, contact_name: str, message: str) -> str:
        if not self.twilio or not self.twilio_from_number:
            return "Twilio is not configured. Add your credentials in .env first."

        target = self.contacts.get(contact_name.lower())
        if not target:
            return f"I don't know {contact_name}. Add that contact in CONTACTS_JSON."

        sms = self.twilio.messages.create(
            from_=self.twilio_from_number,
            to=target,
            body=message,
        )
        return f"Message sent to {contact_name}. SID: {sms.sid}"

    def ask_brain(self, prompt: str) -> str:
        if not self.openai:
            return "OpenAI is not configured. Add OPENAI_API_KEY in .env."

        completion = self.openai.chat.completions.create(
            model=self.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Jarvis, an advanced personal AI assistant. "
                        "Be concise, practical, and action-oriented."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )
        return completion.choices[0].message.content or "I could not generate a response."

    def route_command(self, command: str) -> str:
        if command in {"quit", "exit", "shutdown assistant"}:
            return "__EXIT__"

        sms_match = re.match(r"send message to (\w+) saying (.+)", command)
        if sms_match:
            name, body = sms_match.groups()
            return self.send_sms(name, body)

        open_site = re.match(r"open website (.+)", command)
        if open_site:
            url = open_site.group(1).strip()
            if not url.startswith("http"):
                url = f"https://{url}"
            webbrowser.open(url)
            return f"Opening {url}"

        if command == "what's on my clipboard" or command == "what is on my clipboard":
            value = pyperclip.paste()
            return f"Clipboard says: {value}" if value else "Your clipboard is empty."

        return self.ask_brain(command)

    def run(self) -> None:
        self.speak("Jarvis online. Say Jarvis to wake me up.")

        while True:
            heard = self.listen_once()

            if heard == "speech_service_unavailable":
                self.speak("Speech recognition service is unavailable right now.")
                continue

            if not heard:
                continue

            if self.wake_word not in heard:
                continue

            self.speak("I'm listening.")
            command = self.listen_once()

            if not command:
                self.speak("I didn't catch that. Please repeat.")
                continue

            result = self.route_command(command)
            if result == "__EXIT__":
                self.speak("Shutting down. Goodbye.")
                break

            self.speak(result)


if __name__ == "__main__":
    JarvisAssistant().run()
