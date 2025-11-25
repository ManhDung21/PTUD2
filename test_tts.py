import asyncio
import edge_tts

async def test_tts():
    text = "Xin chào, đây là thử nghiệm giọng đọc."
    voice = "vi-VN-HoaiMyNeural"
    communicate = edge_tts.Communicate(text, voice)
    print(f"Testing TTS with voice: {voice}")
    try:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                print(f"Received audio chunk: {len(chunk['data'])} bytes")
                break # Just need to know it works
        print("TTS test passed!")
    except Exception as e:
        print(f"TTS test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_tts())
