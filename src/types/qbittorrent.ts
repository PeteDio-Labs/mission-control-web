export interface TorrentInfo {
  hash: string;
  name: string;
  state: string;
  progress: number;
  dl_speed: number;
  up_speed: number;
  size?: number;
  added_on?: number;
  completion_on?: number;
  category?: string;
  tags?: string;
  ratio?: number;
  eta?: number;
  num_seeds?: number;
  num_leechs?: number;
}

export interface TransferInfo {
  dl_info_speed: number;
  up_info_speed: number;
  total_uploaded: number;
  total_downloaded: number;
  dht_nodes: number;
}

export interface QBittorrentStatusData {
  connected: boolean;
  timestamp: string;
}
