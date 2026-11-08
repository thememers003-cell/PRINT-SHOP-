const fs = require('fs');
const http = require('http');

async function testUpload() {
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

  const body = Buffer.concat([
    Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="shopSlug"\r\n\r\nsri-ganesh-xerox\r\n'),
    Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="sample_photo.png"\r\nContent-Type: image/png\r\n\r\n'),
    Buffer.from(pngBase64, 'base64'),
    Buffer.from('\r\n--' + boundary + '--\r\n')
  ]);

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/upload',
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Content-Length': body.length
    }
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('Upload response status:', res.statusCode);
      console.log('Upload response body:', data);
    });
  });

  req.on('error', (e) => console.error('Upload request error:', e.message));
  req.write(body);
  req.end();
}

testUpload();
