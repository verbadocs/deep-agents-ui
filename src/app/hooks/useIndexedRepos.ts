import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export interface IndexedRepo {
  id?: number;
  user_id: string;
  repo_owner: string;
  repo_name: string;
  indexed_at?: string;
  last_updated?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export function useIndexedRepos(userId: string) {
  const [repos, setRepos] = useState<IndexedRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<IndexedRepo | null>(null);

  const fetchRepos = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/repos', {
        headers: {
          'x-user-id': userId,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch repos');
      }
      
      const data = await response.json();
      setRepos(data.repos || []);
    } catch (error) {
      console.error('Error fetching indexed repos:', error);
      toast.error('Failed to load indexed repositories');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addRepo = useCallback(async (repoOwner: string, repoName: string, metadata?: Record<string, any>) => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          repo_owner: repoOwner,
          repo_name: repoName,
          metadata,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add repo');
      }
      
      const data = await response.json();
      setRepos(prev => [...prev, data.repo]);
      toast.success(`Added ${repoOwner}/${repoName} to indexed repositories`);
      return data.repo;
    } catch (error) {
      console.error('Error adding indexed repo:', error);
      toast.error('Failed to add repository');
      throw error;
    }
  }, [userId]);

  const removeRepo = useCallback(async (repoOwner: string, repoName: string) => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/repos?owner=${repoOwner}&name=${repoName}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove repo');
      }
      
      setRepos(prev => prev.filter(r => !(r.repo_owner === repoOwner && r.repo_name === repoName)));
      if (selectedRepo?.repo_owner === repoOwner && selectedRepo?.repo_name === repoName) {
        setSelectedRepo(null);
      }
      toast.success(`Removed ${repoOwner}/${repoName} from indexed repositories`);
    } catch (error) {
      console.error('Error removing indexed repo:', error);
      toast.error('Failed to remove repository');
      throw error;
    }
  }, [userId, selectedRepo]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  return {
    repos,
    loading,
    selectedRepo,
    setSelectedRepo,
    addRepo,
    removeRepo,
    refreshRepos: fetchRepos,
  };
}