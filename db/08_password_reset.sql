USE kandypack;

-- Password Reset Table for OWASP ASVS compliant password recovery flow
CREATE TABLE IF NOT EXISTS password_reset (
  reset_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES `user`(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
