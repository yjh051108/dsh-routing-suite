/**
 * zstd-read — 用 node:zlib（与服务端同实现）解压 session.jsonl.zstd。
 * DSH 写盘用 node:zlib zstdCompress（多帧+checksum），7z 兼容性不稳定,故与读取端同栈。
 */
import { readFileSync } from 'node:fs'
import { zstdDecompressSync } from 'node:zlib'

export function zstdRead(zpath) {
  return zstdDecompressSync(readFileSync(zpath)).toString('utf-8')
}
