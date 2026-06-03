const createButton = document.getElementById("create-order-button");
const sendButton = document.getElementById("send-order-button");
const refreshLogsButton = document.getElementById("refresh-logs-button");
const storeIdInput = document.getElementById("store-id");
const statusMessage = document.getElementById("status-message");
const payloadPreview = document.getElementById("payload-preview");
const logsBody = document.getElementById("logs-body");
const logCount = document.getElementById("log-count");

let currentGeneratedOrderId = null;

createButton.addEventListener("click", createSampleOrder);
sendButton.addEventListener("click", sendGeneratedOrder);
refreshLogsButton.addEventListener("click", refreshLogs);

refreshLogs();

async function createSampleOrder() {
  setBusy(createButton, true);
  setStatus("샘플 주문을 생성하는 중입니다.");

  try {
    const response = await fetch("/api/mock/orders/sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: storeIdInput.value.trim() || "STORE_001" }),
    });
    const data = await readJson(response);
    currentGeneratedOrderId = data.generatedOrderId;
    payloadPreview.textContent = JSON.stringify(data.payload, null, 2);
    sendButton.disabled = false;
    setStatus(`샘플 주문이 생성되었습니다. generatedOrderId=${currentGeneratedOrderId}`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setBusy(createButton, false);
  }
}

async function sendGeneratedOrder() {
  if (!currentGeneratedOrderId) {
    setStatus("먼저 샘플 주문을 생성해 주세요.", true);
    return;
  }

  setBusy(sendButton, true);
  setStatus("생성된 주문을 DeepOrder Backend로 전송하는 중입니다.");

  try {
    const response = await fetch("/api/mock/orders/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generatedOrderId: currentGeneratedOrderId }),
    });
    const data = await readJson(response);
    setStatus(
      data.success
        ? `전송 성공: HTTP ${data.httpStatusCode}`
        : `전송 실패: ${data.errorMessage || data.responseBody || "unknown error"}`,
      !data.success,
    );
    await refreshLogs();
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setBusy(sendButton, false);
  }
}

async function refreshLogs() {
  setBusy(refreshLogsButton, true);

  try {
    const response = await fetch("/api/mock/webhook-logs?limit=20");
    const data = await readJson(response);
    renderLogs(data.logs);
  } catch (error) {
    logsBody.innerHTML = `<tr><td colspan="5" class="empty">${escapeHtml(error.message)}</td></tr>`;
  } finally {
    setBusy(refreshLogsButton, false);
  }
}

function renderLogs(logs) {
  logCount.textContent = `${logs.length}건`;

  if (logs.length === 0) {
    logsBody.innerHTML = '<tr><td colspan="5" class="empty">전송 로그가 없습니다.</td></tr>';
    return;
  }

  logsBody.innerHTML = logs
    .map((log) => {
      const response = log.error_message || log.response_body || "";
      return `
        <tr>
          <td>${formatDate(log.created_at)}</td>
          <td><span class="badge ${log.success ? "success" : "failed"}">${log.status}</span></td>
          <td>${log.http_status_code ?? "-"}</td>
          <td>${escapeHtml(log.order_id)}</td>
          <td>${escapeHtml(response.slice(0, 220))}</td>
        </tr>
      `;
    })
    .join("");
}

async function readJson(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || `요청 실패: ${response.status}`);
  }
  return data;
}

function setBusy(button, busy) {
  button.disabled = busy || (button === sendButton && !currentGeneratedOrderId);
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function formatDate(value) {
  const date = new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

