from pathlib import Path

import pandas as pd
import streamlit as st

st.set_page_config(page_title="충주시 카페 분석", page_icon="☕", layout="wide")

CSV_PATH = Path(__file__).parent / "chungju_cafe.csv"


@st.cache_data
def load_chungju_cafe(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="utf-8-sig")
    df = df.rename(columns={"위도": "lat", "경도": "lon"})
    return df


st.title("☕ 충북 충주시 카페 데이터 분석")
st.caption("데이터 출처: 소상공인시장진흥공단_상가(상권)정보_충북_202603.csv")

df = load_chungju_cafe(CSV_PATH)

# ---------------- 사이드바 필터 ----------------
st.sidebar.header("필터")

dong_list = sorted(df["행정동명"].dropna().unique())
selected_dongs = st.sidebar.multiselect("행정동 선택", dong_list, default=dong_list)

keyword = st.sidebar.text_input("상호명 검색", "")

filtered = df[df["행정동명"].isin(selected_dongs)]
if keyword:
    filtered = filtered[filtered["상호명"].str.contains(keyword, case=False, na=False)]

# ---------------- 핵심 지표 ----------------
col1, col2, col3 = st.columns(3)
col1.metric("전체 카페 수", f"{len(filtered):,}개")
col2.metric("행정동 수", f"{filtered['행정동명'].nunique()}개")
top_dong = filtered["행정동명"].value_counts().idxmax() if len(filtered) else "-"
col3.metric("카페 최다 행정동", top_dong)

st.divider()

# ---------------- 행정동별 카페 수 ----------------
st.subheader("행정동별 카페 수")
dong_counts = filtered["행정동명"].value_counts().sort_values(ascending=False)
st.bar_chart(dong_counts)

st.divider()

# ---------------- 지도 ----------------
st.subheader("카페 위치 지도")
map_df = filtered.dropna(subset=["lat", "lon"])
if len(map_df):
    st.map(map_df[["lat", "lon"]])
else:
    st.info("표시할 위치 데이터가 없습니다.")

st.divider()

# ---------------- 브랜드(상호명) 상위 빈도 ----------------
st.subheader("상호명 상위 빈도 (프랜차이즈 추정)")
name_counts = filtered["상호명"].value_counts().head(15)
st.bar_chart(name_counts)

st.divider()

# ---------------- 상세 데이터 ----------------
st.subheader("상세 데이터")
st.dataframe(
    filtered[["상호명", "행정동명", "법정동명", "도로명주소", "lat", "lon"]].reset_index(drop=True),
    use_container_width=True,
)

csv_bytes = filtered.to_csv(index=False).encode("utf-8-sig")
st.download_button("CSV 다운로드", csv_bytes, file_name="충주시_카페.csv", mime="text/csv")
