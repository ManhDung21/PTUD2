"""Text-to-Speech service using edge-tts."""

import io
import edge_tts

async def generate_speech(text: str, voice: str = "vi-VN-HoaiMyNeural") -> io.BytesIO:
    """
    Generate speech audio from text using edge-tts.
    
    Args:
        text: The text to convert to speech.
        voice: The voice to use (default: vi-VN-HoaiMyNeural).
        
    Returns:
        io.BytesIO: Buffer containing the audio data (mp3).
    """
    communicate = edge_tts.Communicate(text, voice)
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
            
    return io.BytesIO(audio_data)
