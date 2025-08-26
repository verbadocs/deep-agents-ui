import React from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  IconButton,
  Typography,
} from '@mui/material';
import { Delete, GitHub } from '@mui/icons-material';
import { useIndexedRepos } from '@/app/hooks/useIndexedRepos';
import styles from './IndexedReposDropdown.module.scss';

interface IndexedReposDropdownProps {
  userId: string;
  onRefresh?: () => void;
}

export function IndexedReposDropdown({ userId, onRefresh }: IndexedReposDropdownProps) {
  const { repos, loading, selectedRepo, setSelectedRepo, removeRepo, refreshRepos } = useIndexedRepos(userId);

  // Expose refresh method for parent component
  React.useEffect(() => {
    if (window) {
      (window as any).refreshIndexedRepos = refreshRepos;
    }
    if (onRefresh) {
      onRefresh();
    }
  }, [refreshRepos, onRefresh]);

  const handleSelectChange = (value: string) => {
    const repo = repos.find(r => `${r.repo_owner}/${r.repo_name}` === value);
    setSelectedRepo(repo || null);
  };

  return (
    <Box className={styles.container}>
      <FormControl size="small" className={styles.formControl}>
        <InputLabel id="indexed-repos-label">Indexed Repos</InputLabel>
        <Select
          labelId="indexed-repos-label"
          value={selectedRepo ? `${selectedRepo.repo_owner}/${selectedRepo.repo_name}` : ''}
          onChange={(e) => handleSelectChange(e.target.value as string)}
          label="Indexed Repos"
          displayEmpty
          disabled={loading}
          sx={{
            minWidth: 250,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.5)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'white',
            },
            '& .MuiSvgIcon-root': {
              color: 'white',
            },
          }}
          renderValue={(value) => {
            if (!value) {
              return <em style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No repository selected</em>;
            }
            return (
              <Box display="flex" alignItems="center" gap={1}>
                <GitHub fontSize="small" />
                <span>{value}</span>
              </Box>
            );
          }}
        >
          {repos.length === 0 ? (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                No repositories indexed yet. Use Repository Parser to index a repo.
              </Typography>
            </MenuItem>
          ) : (
            repos.map((repo) => (
              <MenuItem 
                key={`${repo.repo_owner}/${repo.repo_name}`} 
                value={`${repo.repo_owner}/${repo.repo_name}`}
              >
                <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                  <Box display="flex" alignItems="center" gap={1}>
                    <GitHub fontSize="small" />
                    <span>{repo.repo_owner}/{repo.repo_name}</span>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRepo(repo.repo_owner, repo.repo_name);
                    }}
                    sx={{ ml: 2 }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>
    </Box>
  );
}