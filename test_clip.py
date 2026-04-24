#!/usr/bin/env python3
from pathlib import Path
from moviepy.video.io.VideoFileClip import VideoFileClip

source_file = Path('/app/storage/source/goal-test-match_Goal.mp4')
clip_path = Path('/app/storage/clips/test-clip.mp4')

print(f"Source file exists: {source_file.exists()}")
if source_file.exists():
    print(f"Source file size: {source_file.stat().st_size}")

try:
    video = VideoFileClip(str(source_file))
    print(f"Video duration: {video.duration}")
    print(f"Video FPS: {video.fps}")
    
    # Try using subclipped (the newer moviepy API)
    clip = video.subclipped(0, 5)
    print(f"Clip created successfully")
    print(f"Clip duration: {clip.duration}")
    
    clip.write_videofile(str(clip_path), codec="libx264", verbose=False, logger=None)
    print(f"Clip written successfully")
    print(f"Clip file exists: {clip_path.exists()}")
    if clip_path.exists():
        print(f"Clip file size: {clip_path.stat().st_size}")
    video.close()
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
