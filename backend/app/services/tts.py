"""Text-to-Speech service using edge-tts."""

import io
import edge_tts

async def generate_speech(text: str, voice: str = "vi-VN-HoaiMyNeural"):
    """
    Generate speech audio from text using edge-tts (Streaming).
    
    Args:
        text: The text to convert to speech.
        voice: The voice to use (default: vi-VN-HoaiMyNeural).
        
    Yields:
        bytes: Audio data chunks (mp3).
    """
    try:
        communicate = edge_tts.Communicate(text, voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]
    except Exception as e:
        print(f"Edge-TTS failed: {e}. Falling back to gTTS.")
        from gtts import gTTS
        import io
        
        # Fallback to gTTS (Buffered, logic remains similar for fallback but wrapped in generator)
        # Note: gTTS doesn't support true streaming efficiently, so we buffer it.
        tts = gTTS(text=text, lang='vi')
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        yield fp.read()
