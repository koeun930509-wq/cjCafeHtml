// CAFE_DATA 는 cjCafeData.js 에서 전역으로 로드됨
const allDongs = [...new Set(CAFE_DATA.map((d) => d.dong))].sort();

let map, markerLayer, dongChart, nameChart;

function initSidebar() {
  const container = document.getElementById("dongFilter");
  allDongs.forEach((dong) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = dong;
    checkbox.checked = true;
    checkbox.addEventListener("change", render);
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" " + dong));
    container.appendChild(label);
  });

  document.getElementById("selectAll").addEventListener("click", () => {
    container.querySelectorAll("input[type=checkbox]").forEach((cb) => (cb.checked = true));
    render();
  });
  document.getElementById("clearAll").addEventListener("click", () => {
    container.querySelectorAll("input[type=checkbox]").forEach((cb) => (cb.checked = false));
    render();
  });
  document.getElementById("searchInput").addEventListener("input", render);
}

function getCheckedDongs() {
  return [...document.querySelectorAll("#dongFilter input[type=checkbox]:checked")].map(
    (cb) => cb.value
  );
}

function getFiltered() {
  const checked = new Set(getCheckedDongs());
  const keyword = document.getElementById("searchInput").value.trim().toLowerCase();
  return CAFE_DATA.filter((d) => {
    if (!checked.has(d.dong)) return false;
    if (keyword && !d.name.toLowerCase().includes(keyword)) return false;
    return true;
  });
}

function countBy(items, key) {
  const counts = {};
  items.forEach((item) => {
    counts[item[key]] = (counts[item[key]] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function renderMetrics(filtered) {
  document.getElementById("metricTotal").textContent = filtered.length.toLocaleString() + "개";
  const dongSet = new Set(filtered.map((d) => d.dong));
  document.getElementById("metricDongCount").textContent = dongSet.size + "개";
  const topDong = countBy(filtered, "dong")[0];
  document.getElementById("metricTopDong").textContent = topDong ? topDong[0] : "-";
}

function renderDongChart(filtered) {
  const counts = countBy(filtered, "dong");
  const ctx = document.getElementById("dongChart");
  const data = {
    labels: counts.map((c) => c[0]),
    datasets: [
      {
        label: "카페 수",
        data: counts.map((c) => c[1]),
        backgroundColor: "#8a6d4c",
      },
    ],
  };
  if (dongChart) {
    dongChart.data = data;
    dongChart.update();
  } else {
    dongChart = new Chart(ctx, {
      type: "bar",
      data,
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { autoSkip: false, maxRotation: 70, minRotation: 40 } } },
      },
    });
  }
}

function renderNameChart(filtered) {
  const counts = countBy(filtered, "name").slice(0, 15);
  const ctx = document.getElementById("nameChart");
  const data = {
    labels: counts.map((c) => c[0]),
    datasets: [
      {
        label: "매장 수",
        data: counts.map((c) => c[1]),
        backgroundColor: "#c99b5f",
      },
    ],
  };
  if (nameChart) {
    nameChart.data = data;
    nameChart.update();
  } else {
    nameChart = new Chart(ctx, {
      type: "bar",
      data,
      options: {
        indexAxis: "y",
        responsive: true,
        plugins: { legend: { display: false } },
      },
    });
  }
}

function renderMap(filtered) {
  if (!map) {
    map = L.map("map").setView([36.99, 127.93], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
  }
  markerLayer.clearLayers();
  filtered.forEach((d) => {
    L.marker([d.lat, d.lon])
      .addTo(markerLayer)
      .bindPopup(`<b>${escapeHtml(d.name)}</b><br>${escapeHtml(d.address)}`);
  });
}

function mapLinks(d) {
  const naverUrl = `https://map.naver.com/p/search/${encodeURIComponent(d.address || d.name)}`;
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lon}`;
  return `<a class="map-btn naver" href="${naverUrl}" target="_blank" rel="noopener">네이버</a><a class="map-btn google" href="${googleUrl}" target="_blank" rel="noopener">구글</a>`;
}

function renderTable(filtered) {
  document.getElementById("tableCount").textContent = filtered.length.toLocaleString();
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";
  const fragment = document.createDocumentFragment();
  filtered.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(d.name)}</td><td>${escapeHtml(d.dong)}</td><td>${escapeHtml(
      d.bdong
    )}</td><td>${escapeHtml(d.address)}</td><td class="map-cell">${mapLinks(d)}</td>`;
    fragment.appendChild(tr);
  });
  tbody.appendChild(fragment);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function downloadCsv(filtered) {
  const header = ["상호명", "행정동명", "법정동명", "도로명주소", "위도", "경도"];
  const rows = filtered.map((d) => [d.name, d.dong, d.bdong, d.address, d.lat, d.lon]);
  const csvLines = [header, ...rows].map((row) =>
    row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
  );
  const csvContent = "﻿" + csvLines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "충주시_카페.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function render() {
  const filtered = getFiltered();
  renderMetrics(filtered);
  renderDongChart(filtered);
  renderNameChart(filtered);
  renderMap(filtered);
  renderTable(filtered);
}

document.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  document.getElementById("downloadBtn").addEventListener("click", () => downloadCsv(getFiltered()));
  render();
});
