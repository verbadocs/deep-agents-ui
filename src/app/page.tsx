"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useQueryState } from "nuqs";
import { ChatInterface } from "./components/ChatInterface/ChatInterface";
import { TasksFilesSidebar } from "./components/TasksFilesSidebar/TasksFilesSidebar";
import { SubAgentPanel } from "./components/SubAgentPanel/SubAgentPanel";
import { FileViewDialog } from "./components/FileViewDialog/FileViewDialog";
import { createClient } from "@/lib/client";
import { useAuthContext } from "@/providers/Auth";
import type { SubAgent, FileItem, TodoItem } from "./types/types";
import styles from "./page.module.scss";

// Material-UI imports
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Popover,
  TextField,
  MenuItem,
  Divider,
  Button as MuiButton,
} from "@mui/material";
import SentimentVerySatisfiedIcon from "@mui/icons-material/SentimentVerySatisfied";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import toast from "react-hot-toast";
import { Folder } from "lucide-react";

export default function HomePage() {
  const { session } = useAuthContext();
  const [threadId, setThreadId] = useQueryState("threadId");
  const [selectedSubAgent, setSelectedSubAgent] = useState<SubAgent | null>(
    null
  );
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoadingThreadState, setIsLoadingThreadState] = useState(false);

  // Material-UI header state
  const [anchorElFeedback, setAnchorElFeedback] = useState<null | HTMLElement>(
    null
  );
  const [anchorElAccount, setAnchorElAccount] = useState<null | HTMLElement>(
    null
  );
  const [topic, setTopic] = useState("");
  const [feedback, setFeedback] = useState("");
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const open = Boolean(anchorElFeedback);
  const menuOpen = Boolean(anchorElAccount);

  // Mock user data for the header
  const user = {
    userId: "user123",
    username: "User",
  };

  // Material-UI header handlers
  const handleClickAccount = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElAccount(event.currentTarget);
  };

  const handleCloseAccountMenu = () => {
    setAnchorElAccount(null);
  };

  const handleFeedback = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElFeedback(event.currentTarget);
  };

  const handleCloseFeedback = () => {
    setAnchorElFeedback(null);
  };

  const handleSubmitFeedback = async () => {
    // Mock feedback submission
    setTopic("");
    setFeedback("");
    setSelectedReaction(null);
    toast.success(`Feedback Received!`);
    handleCloseFeedback();
  };

  const menuItemStyle = {
    fontSize: "14px",
    px: 1,
    py: 1.2,
    borderRadius: "6px",
    "&:hover": {
      backgroundColor: "#f5f5f5",
    },
  };

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // When the threadId changes, grab the thread state from the graph server
  useEffect(() => {
    const fetchThreadState = async () => {
      if (!threadId || !session?.accessToken) {
        setTodos([]);
        setFiles({});
        setIsLoadingThreadState(false);
        return;
      }
      setIsLoadingThreadState(true);
      try {
        const client = createClient(session.accessToken);
        const state = await client.threads.getState(threadId);

        if (state.values) {
          const currentState = state.values as {
            todos?: TodoItem[];
            files?: Record<string, string>;
          };
          setTodos(currentState.todos || []);
          setFiles(currentState.files || {});
        }
      } catch (error) {
        console.error("Failed to fetch thread state:", error);
        setTodos([]);
        setFiles({});
      } finally {
        setIsLoadingThreadState(false);
      }
    };
    fetchThreadState();
  }, [threadId, session?.accessToken]);

  const handleNewThread = useCallback(() => {
    setThreadId(null);
    setSelectedSubAgent(null);
    setTodos([]);
    setFiles({});
  }, [setThreadId]);

  const handleFileSave = useCallback((filePath: string, content: string) => {
    setFiles((prevFiles) => ({
      ...prevFiles,
      [filePath]: content,
    }));

    // Close the file dialog
    setSelectedFile(null);

    // TODO: Optionally send the updated file to the backend/thread state
    // This would require implementing an API call to update the thread state
  }, []);

  return (
    <div className={styles.container}>
      {/* Material-UI AppBar Header - Full Width */}
      <AppBar
        position="fixed"
        color="transparent"
        sx={{ backgroundColor: "black", zIndex: 1200 }}
      >
        <Popover
          open={menuOpen}
          anchorEl={anchorElAccount}
          onClose={handleCloseAccountMenu}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{
            sx: {
              p: 2,
              width: 280,
              borderRadius: 3,
              bgcolor: "#fff",
              color: "#000",
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              border: "1px solid #e5e5e5",
              fontFamily: "Inter, sans-serif",
            },
          }}
        >
          <Box display="flex" flexDirection="column" gap={1}>
            {/* User Info */}
            <Box>
              <Typography fontWeight={600} fontSize="14px">
                {user?.userId || "Account"}
              </Typography>
            </Box>

            <Divider sx={{ my: 1, borderColor: "#e5e5e5" }} />

            {/* Navigation */}
            <Box>
              <MenuItem
                onClick={() => {
                  console.log("Dashboard clicked");
                  handleCloseAccountMenu();
                }}
                sx={menuItemStyle}
              >
                Dashboard
              </MenuItem>

              <MenuItem
                onClick={() => {
                  console.log("Home Page clicked");
                  handleCloseAccountMenu();
                }}
                sx={{ ...menuItemStyle, justifyContent: "space-between" }}
              >
                Home Page{" "}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  console.log("Log Out clicked");
                  handleCloseAccountMenu();
                }}
                sx={{ ...menuItemStyle, justifyContent: "space-between" }}
              >
                Log Out{" "}
                <Box component="span" fontSize="14px">
                  ↩
                </Box>
              </MenuItem>
            </Box>
          </Box>
        </Popover>

        <Popover
          open={open}
          anchorEl={anchorElFeedback}
          onClose={handleCloseFeedback}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          PaperProps={{
            sx: {
              p: 2,
              width: 320,
              borderRadius: 3,
              backgroundColor: "#1a1a1a", // DARK BACKGROUND
              color: "white", // TEXT COLOR
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              border: "1px solid #333", // Optional border
            },
          }}
        >
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              select
              label="Select a topic..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              size="small"
              fullWidth
            >
              <MenuItem value="bug">Bug Report</MenuItem>
              <MenuItem value="feature">Feature Request</MenuItem>
              <MenuItem value="general">General Feedback</MenuItem>
            </TextField>
            <TextField
              label="Your feedback..."
              multiline
              rows={3}
              value={feedback}
              onChange={(e) => {
                const input = e.target.value;
                if (input.length <= 250) {
                  setFeedback(input);
                }
              }}
              InputLabelProps={{ style: { color: "#ccc" } }}
              InputProps={{ style: { color: "white" } }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "#444",
                  },
                  "&:hover fieldset": {
                    borderColor: "#666",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#888",
                  },
                },
              }}
              fullWidth
            />

            <Typography
              variant="caption"
              sx={{ alignSelf: "flex-end", color: "#aaa", mt: -1, mb: 1 }}
            >
              {feedback.length} / 250 characters
            </Typography>

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box display="flex" gap={1}>
                {[
                  { icon: <SentimentVerySatisfiedIcon />, value: "happy" },
                  { icon: <SentimentSatisfiedAltIcon />, value: "smile" },
                  { icon: <SentimentDissatisfiedIcon />, value: "meh" },
                  { icon: <SentimentVeryDissatisfiedIcon />, value: "sad" },
                ].map(({ icon, value }) => {
                  const isSelected = selectedReaction === value;

                  return (
                    <IconButton
                      key={value}
                      size="small"
                      onClick={() =>
                        setSelectedReaction(isSelected ? null : value)
                      }
                      sx={{
                        color: isSelected ? "white" : "#777",
                        backgroundColor: isSelected ? "#333" : "transparent",
                        borderRadius: "50%",
                        border: isSelected ? "1px solid #555" : "none",
                        transition: "all 0.2s",
                      }}
                    >
                      {icon}
                    </IconButton>
                  );
                })}
              </Box>

              <MuiButton
                variant="contained"
                size="small"
                sx={{ backgroundColor: "black", color: "white" }}
                onClick={() => handleSubmitFeedback()}
              >
                Send
              </MuiButton>
            </Box>
          </Box>
        </Popover>
        <Toolbar>
          <img
            src={"/verba.svg"}
            alt="Verba Logo"
            style={{
              height: 40,
              filter: "brightness(0) invert(1)",
            }}
          />

          <Divider color="white" sx={{ mx: 2 }} />

          <Box color={"grey"} display={"flex"} gap={1.5} alignItems={"center"}>
            <Folder size={20} />
            <Typography>{user.userId}</Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box columnGap={2} display={"flex"} alignItems={"center"}>
            <MuiButton
              variant="outlined"
              sx={{ color: "white" }}
              onClick={handleFeedback}
            >
              Feedback
            </MuiButton>

            <IconButton
              size="small"
              onClick={handleClickAccount}
              aria-controls={menuOpen ? "account-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={menuOpen ? "true" : undefined}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: "purple",
                }}
              >
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <div className={styles.contentWrapper}>
        <TasksFilesSidebar
          todos={todos}
          files={files}
          onFileClick={setSelectedFile}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        <div className={styles.mainContent}>
          <ChatInterface
            threadId={threadId}
            selectedSubAgent={selectedSubAgent}
            setThreadId={setThreadId}
            onSelectSubAgent={setSelectedSubAgent}
            onTodosUpdate={setTodos}
            onFilesUpdate={setFiles}
            onNewThread={handleNewThread}
            isLoadingThreadState={isLoadingThreadState}
          />
          {selectedSubAgent && (
            <SubAgentPanel
              subAgent={selectedSubAgent}
              onClose={() => setSelectedSubAgent(null)}
            />
          )}
        </div>
      </div>
      {selectedFile && (
        <FileViewDialog
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onFileSave={handleFileSave}
        />
      )}
    </div>
  );
}
