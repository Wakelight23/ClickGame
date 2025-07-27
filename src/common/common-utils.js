// JSON 바디를 파싱해 객체로 반환
export function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let buf = [];
    req.on('data', (chunk) => buf.push(chunk));
    req.on('end', () => {
      try {
        const str = Buffer.concat(buf).toString();
        resolve(JSON.parse(str || '{}'));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', () => reject(new Error('Request error')));
  });
}

// JSON 응답 전송
export function sendJson(res, status, data, headers) {
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}
