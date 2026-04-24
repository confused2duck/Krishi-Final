import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

const API = API_BASE_URL;

export function usePageImages(page, section = null) {
  const [images, setImages] = useState([]);
  useEffect(() => {
    if (!page) return;
    const params = new URLSearchParams({ page });
    if (section) params.set('section', section);
    axios.get(`${API}/api/images?${params.toString()}`)
      .then(r => setImages(r.data))
      .catch(() => {});
  }, [page, section]);
  return { images, imgUrl: (id) => `${API}/api/images/${id}` };
}

export function usePageVideos(page, section = null) {
  const [videos, setVideos] = useState([]);
  useEffect(() => {
    if (!page) return;
    const params = new URLSearchParams({ page });
    if (section) params.set('section', section);
    axios.get(`${API}/api/videos?${params.toString()}`)
      .then(r => setVideos(r.data))
      .catch(() => {});
  }, [page, section]);
  return { videos, vidUrl: (id) => `${API}/api/videos/${id}` };
}
