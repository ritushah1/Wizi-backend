
// middleware/bullBoardAuth.js
function bullBoardAuth(req, res, next) {
  const auth = req.headers.authorization;

  const expectedUser = process.env.BULLBOARD_USER;
  const expectedPass = process.env.BULLBOARD_PASSWORD;

  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Queue Dashboard"');
    return res.status(401).send('Authentication required');
  }

  const base64Credentials = auth.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [user, pass] = credentials.split(':');

  if (user === expectedUser && pass === expectedPass) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Queue Dashboard"');
  return res.status(401).send('Invalid credentials');
}

module.exports = {bullBoardAuth};