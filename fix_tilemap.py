#!/usr/bin/env python3
"""
修复 Room.tscn 的 TileMapLayer 瓦片数据
生成一个 10x8 的房间，包含地板和墙壁

Godot 4 TileMapLayer 数据格式:
- 格式版本 (1 byte): 0x00 (当前版本)
- 保留 (3 bytes): 0x00 0x00 0x00
- 瓦片数据 (每个瓦片 12 bytes):
  - x (4 bytes, int32, little-endian)
  - y (4 bytes, int32, little-endian)
  - tile_data (4 bytes, uint32, little-endian):
    - bits 0-15: atlas_coords_x | (atlas_coords_y << 16) 或 tile_id
    - bits 16-21: alternative
    - bit 22: flip_h
    - bit 23: flip_v
    - bit 24: transpose
"""

import struct
import base64

def encode_tile(x, y, atlas_x=0, atlas_y=0, alternative=0, flip_h=0, flip_v=0, transpose=0):
    """
    编码单个瓦片数据为 Godot 4 TileMapLayer 格式
    """
    # 构建 tile_data
    # 对于 TileSetAtlasSource，使用 atlas 坐标
    tile_data = atlas_x | (atlas_y << 16)
    tile_data |= (alternative & 0x3F) << 16
    tile_data |= (flip_h & 0x1) << 22
    tile_data |= (flip_v & 0x1) << 23
    tile_data |= (transpose & 0x1) << 24
    
    # 打包为 little-endian 字节
    return struct.pack('<iiI', x, y, tile_data)

def generate_room_tiles():
    """
    生成房间瓦片数据
    房间大小: 10x8 瓦片
    
    根据 Room_Builder_free_32x32.png 纹理图集:
    - 地板瓦片通常在 (0,0) 或 (1,0) 等位置
    - 墙壁瓦片在 (0,5), (1,5), (0,6), (1,6) 等位置
    """
    tiles = []
    
    # 房间尺寸
    width = 10
    height = 8
    
    # 瓦片偏移 (让房间居中)
    offset_x = -5
    offset_y = -4
    
    for y in range(height):
        for x in range(width):
            # 判断是墙壁还是地板
            is_wall = (x == 0 or x == width - 1 or y == 0 or y == height - 1)
            
            if is_wall:
                # 墙壁 - 使用纹理中合适的墙壁瓦片
                # 根据 Room_Builder_free_32x32.png，墙壁瓦片在 (0,5) 位置
                atlas_x = 0
                atlas_y = 5
            else:
                # 地板 - 使用 (0,0) 作为地板
                atlas_x = 0
                atlas_y = 0
            
            tiles.append(encode_tile(x + offset_x, y + offset_y, atlas_x, atlas_y))
    
    return b''.join(tiles)

def generate_tilemap_data():
    """
    生成完整的 TileMapLayer 数据
    格式: [版本(1)] [保留(3)] [瓦片数据...]
    """
    # 格式版本 0
    header = bytes([0x00, 0x00, 0x00, 0x00])
    
    # 瓦片数据
    tiles_data = generate_room_tiles()
    
    return header + tiles_data

def main():
    # 生成完整的 tilemap 数据
    tilemap_data = generate_tilemap_data()
    
    # 编码为 base64
    encoded = base64.b64encode(tilemap_data).decode('utf-8')
    
    print("生成的 TileMap 数据 (PackedByteArray):")
    print(f'"{encoded}"')
    
    # 读取原始文件
    with open('scene/Room.tscn', 'r') as f:
        content = f.read()
    
    # 替换 tile_map_data
    import re
    pattern = r'tile_map_data = PackedByteArray\("[^"]*"\)'
    replacement = f'tile_map_data = PackedByteArray("{encoded}")'
    
    new_content = re.sub(pattern, replacement, content)
    
    # 写回文件
    with open('scene/Room.tscn', 'w') as f:
        f.write(new_content)
    
    print("\n已更新 scene/Room.tscn 文件")
    print(f"数据总大小: {len(tilemap_data)} 字节")
    print(f"头部: 4 字节")
    print(f"瓦片数据: {len(tilemap_data) - 4} 字节 ({(len(tilemap_data) - 4) // 12} 个瓦片)")

if __name__ == '__main__':
    main()
