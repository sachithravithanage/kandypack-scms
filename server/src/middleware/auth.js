const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
        const header = req.headers.authorization;
        if (!header) return res.status(401).json({ error: 'No token provided' });
        const token = header.startsWith('Bearer ') ? header.slice(7).trim() : header.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });

        try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = {
                        ...decoded,
                        userId: decoded.userId || decoded.user_id,
                        user_id: decoded.user_id || decoded.userId,
                        roleId: decoded.roleId || decoded.role_id,
                        role_id: decoded.role_id || decoded.roleId
                };
                next();
        } catch (err) {
                res.status(401).json({ error: 'Invalid or expired token' });
        }
}


function requireRole(allowedRoleIds) {
        return (req, res, next) => {
                if (!req.user) {
                        return res.status(401).json({ error: 'Authentication required' });
                }
                const currentRoleId = req.user.roleId || req.user.role_id;
                if (!allowedRoleIds.includes(currentRoleId)) {
                        return res.status(403).json({ error: 'Not authorized for this action' });
                }
                next();
        };
}

module.exports = { requireAuth, requireRole };
