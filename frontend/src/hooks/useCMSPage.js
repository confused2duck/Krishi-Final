import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

const API = API_BASE_URL;

export function useCMSPage(route) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!route) return;
    let active = true;
    setLoading(true);

    axios.get(`${API}/api/pages/content`, { params: { route } })
      .then((response) => {
        if (active) {
          setPage(response.data);
        }
      })
      .catch(() => {
        if (active) {
          setPage(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [route]);

  const sections = useMemo(() => page?.sections || {}, [page]);

  const getText = (key, fallback = '') => {
    const value = sections?.[key];
    return typeof value === 'string' ? value : fallback;
  };

  const getImage = (key, fallback = '') => {
    const value = sections?.[key];
    return typeof value === 'string' ? value : fallback;
  };

  const getSection = (key, fallback = null) => {
    const value = sections?.[key];
    return value ?? fallback;
  };

  return {
    page,
    sections,
    loading,
    getText,
    getImage,
    getSection,
  };
}
