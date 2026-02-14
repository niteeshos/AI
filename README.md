# Jarvis-Style Personal AI Assistant (Starter)

This repository now contains a **working starter** for a local "Jarvis"-style assistant with:

- 🎙️ Voice input (microphone)
- 🗣️ Voice output (text-to-speech)
- 🧠 "Super brain" mode via an LLM API
- 💬 SMS sending (Twilio)
- ⚙️ Command routing for device actions

> Important: no assistant can literally "do anything" safely. This project is designed as a powerful, extensible base while keeping dangerous actions limited and explicit.

## What you get

- `assistant.py` — main voice assistant loop and command router
- `requirements.txt` — Python dependencies
- `.env.example` — environment variables you should configure

## Quick start

1. **Create and activate a virtual environment**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. **Install dependencies**

```bash
pip install -r requirements.txt
```

3. **Configure environment variables**

```bash
cp .env.example .env
# edit .env with your API keys and phone numbers
```

4. **Run the assistant**

```bash
python assistant.py
```

Say: `jarvis` to wake it up, then a command.

## Example voice commands

- "Jarvis, send message to mom saying I'll be late by 10 minutes"
- "Jarvis, open website youtube.com"
- "Jarvis, what's on my clipboard"
- "Jarvis, explain quantum computing in simple words"

## How "1000x super brain" works here

The assistant uses an LLM as a reasoning engine for requests that are not direct local commands. In this starter, that is powered through the OpenAI API, but you can swap it for any model/provider.

## Security and safety notes

- Keep `.env` out of git.
- Limit what high-privilege commands can execute.
- Add authentication for remote controls.
- Log all actions if you plan to use this assistant daily.

## Next upgrades (recommended)

- Add wake word engine (`openwakeword` or Porcupine)
- Add long-term memory (SQLite or vector DB)
- Add WhatsApp/Telegram connectors
- Add calendar and email tools
- Add local LLM fallback for offline mode
