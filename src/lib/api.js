export async function request(path, { body, csrf, ...options } = {}) {
  let res;
  try {
    res = await fetch("/api/" + path, {
      credentials: "same-origin",
      ...options,
      ...(body !== undefined
        ? {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(csrf ? { "x-csrf-token": csrf } : {}),
            },
            body: JSON.stringify(body),
          }
        : {}),
    });
  } catch {
    throw Error(
      "Không kết nối được máy chủ. Giữ terminal npm run dev đang chạy rồi thử lại.",
    );
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw Error("Máy chủ trả về dữ liệu không hợp lệ.");
  }
  if (!res.ok)
    throw Object.assign(Error(data.error || "Thao tác thất bại."), {
      status: res.status,
    });
  return data;
}

// getRandomValues hoạt động cả khi demo bằng HTTP qua IP mạng LAN.
export function newRequestId() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
