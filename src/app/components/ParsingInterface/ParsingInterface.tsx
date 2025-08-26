"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoaderCircle, Github, Search, FileText, Database, CheckCircle } from "lucide-react";
import styles from "./ParsingInterface.module.scss";

interface ParsingInterfaceProps {
  parsingUiUrl?: string;
}

interface IndexingProgress {
  type: string;
  message: string;
  timestamp: string;
  progress?: number;
}

interface QueryResult {
  answer: string;
  sources?: Array<{
    file: string;
    content: string;
    score: number;
  }>;
}

export const ParsingInterface: React.FC<ParsingInterfaceProps> = ({ 
  parsingUiUrl = process.env.NEXT_PUBLIC_PARSING_UI_URL || "http://localhost:3001" 
}) => {
  const [isIndexing, setIsIndexing] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [question, setQuestion] = useState("");
  const [enhanced, setEnhanced] = useState(false);
  const [progress, setProgress] = useState<IndexingProgress[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [status, setStatus] = useState<{ hasIndexedRepositories: boolean } | null>(null);
  const [indexingComplete, setIndexingComplete] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Check status on mount
  React.useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`${parsingUiUrl}/api/status`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to check status:", error);
    }
  }, [parsingUiUrl]);

  const handleIndexRepo = useCallback(async () => {
    if (!githubUrl.trim()) return;

    setIsIndexing(true);
    setProgress([]);
    setIndexingComplete(false);

    try {
      // Start indexing
      const response = await fetch(`${parsingUiUrl}/api/index-repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl, accessToken }),
      });

      if (!response.ok) {
        throw new Error("Failed to start indexing");
      }

      // Set up WebSocket connection for progress updates
      const ws = new WebSocket(`ws://${parsingUiUrl.replace("http://", "")}`);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setProgress(prev => [...prev, data]);
          
          if (data.type === "complete") {
            setIndexingComplete(true);
            setIsIndexing(false);
            ws.close();
            checkStatus(); // Refresh status
            
            // Auto-close dialog after 3 seconds
            setTimeout(() => {
              setIsOpen(false);
              setIndexingComplete(false);
              setProgress([]);
            }, 3000);
          } else if (data.type === "error") {
            ws.close();
            setIsIndexing(false);
            checkStatus(); // Refresh status
          }
        } catch (error) {
          console.error("Failed to parse progress message:", error);
        }
      };

      ws.onerror = () => {
        setIsIndexing(false);
        setProgress(prev => [...prev, { 
          type: "error", 
          message: "WebSocket connection failed", 
          timestamp: new Date().toISOString() 
        }]);
      };

    } catch (error) {
      console.error("Indexing failed:", error);
      setIsIndexing(false);
      setProgress(prev => [...prev, { 
        type: "error", 
        message: error instanceof Error ? error.message : "Unknown error", 
        timestamp: new Date().toISOString() 
      }]);
    }
  }, [githubUrl, accessToken, parsingUiUrl, checkStatus]);

  const handleQuery = useCallback(async () => {
    if (!question.trim()) return;

    setIsQuerying(true);
    setQueryResult(null);

    try {
      const response = await fetch(`${parsingUiUrl}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, enhanced }),
      });

      if (!response.ok) {
        throw new Error("Failed to process query");
      }

      const result = await response.json();
      setQueryResult(result);
    } catch (error) {
      console.error("Query failed:", error);
      setQueryResult({ 
        answer: `Error: ${error instanceof Error ? error.message : "Unknown error"}` 
      });
    } finally {
      setIsQuerying(false);
    }
  }, [question, enhanced, parsingUiUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
          <Database size={16} className="mr-2" />
          Repository Parser
        </Button>
      </DialogTrigger>
      <DialogContent className={styles.dialogContent}>
        <DialogHeader>
          <DialogTitle>Repository Parser & Query</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="index" className={styles.tabs}>
          <TabsList className={styles.tabsList}>
            <TabsTrigger value="index" className={styles.tabTrigger}>
              <Github size={16} className="mr-2" />
              Index Repository
            </TabsTrigger>
            <TabsTrigger value="query" className={styles.tabTrigger}>
              <Search size={16} className="mr-2" />
              Query Repository
            </TabsTrigger>
          </TabsList>

          <TabsContent value="index" className={styles.tabContent}>
            <div className={styles.indexSection}>
              <div className={styles.inputGroup}>
                <label>GitHub Repository URL:</label>
                <Input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  disabled={isIndexing}
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label>GitHub Access Token (optional):</label>
                <Input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="ghp_..."
                  disabled={isIndexing}
                />
              </div>

              <Button 
                onClick={handleIndexRepo} 
                disabled={!githubUrl.trim() || isIndexing}
                className={styles.indexButton}
              >
                {isIndexing ? (
                  <>
                    <LoaderCircle size={16} className="mr-2 animate-spin" />
                    Indexing...
                  </>
                ) : (
                  <>
                    <Database size={16} className="mr-2" />
                    Start Indexing
                  </>
                )}
              </Button>

              {progress.length > 0 && (
                <div className={styles.progressSection}>
                  <h4>Progress:</h4>
                  <div className={styles.progressList}>
                    {progress.map((item, index) => (
                      <div key={index} className={`${styles.progressItem} ${styles[item.type]}`}>
                        <span className={styles.timestamp}>
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={styles.message}>{item.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {indexingComplete && (
                <div className={styles.successIndicator}>
                  <CheckCircle className={styles.successIcon} size={24} />
                  <span>Repository indexed successfully! Dialog will close automatically...</span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="query" className={styles.tabContent}>
            <div className={styles.querySection}>
              {status && (
                <div className={styles.statusSection}>
                  <div className={`${styles.statusIndicator} ${status.hasIndexedRepositories ? styles.hasData : styles.noData}`}>
                    {status.hasIndexedRepositories ? (
                      <>
                        <Database size={16} className="mr-2" />
                        Repository indexed and ready for queries
                      </>
                    ) : (
                      <>
                        <FileText size={16} className="mr-2" />
                        No repositories indexed yet
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.inputGroup}>
                <label>Question:</label>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question about the indexed repository..."
                  disabled={isQuerying}
                />
              </div>

              <div className={styles.checkboxGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={enhanced}
                    onChange={(e) => setEnhanced(e.target.checked)}
                    disabled={isQuerying}
                  />
                  Use enhanced knowledge graph (if available)
                </label>
              </div>

              <Button 
                onClick={handleQuery} 
                disabled={!question.trim() || isQuerying}
                className={styles.queryButton}
              >
                {isQuerying ? (
                  <>
                    <LoaderCircle size={16} className="mr-2 animate-spin" />
                    Querying...
                  </>
                ) : (
                  <>
                    <Search size={16} className="mr-2" />
                    Ask Question
                  </>
                )}
              </Button>

              {queryResult && (
                <div className={styles.resultSection}>
                  <h4>Answer:</h4>
                  <div className={styles.answer}>{queryResult.answer}</div>
                  
                  {queryResult.sources && queryResult.sources.length > 0 && (
                    <div className={styles.sourcesSection}>
                      <h4>Sources:</h4>
                      <div className={styles.sourcesList}>
                        {queryResult.sources.map((source, index) => (
                          <div key={index} className={styles.sourceItem}>
                            <div className={styles.sourceHeader}>
                              <span className={styles.sourceFile}>{source.file}</span>
                              <span className={styles.sourceScore}>Score: {source.score.toFixed(2)}</span>
                            </div>
                            <div className={styles.sourceContent}>{source.content}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
