import type { PostofficeState } from "./domain";
export function previewState(): PostofficeState {
  const now = new Date();
  return {
    userName: "다정한",
    dailyEnabled: true,
    generating: false,
    cat: {
      id: "preview-cat",
      name: "별이",
      personality: "햇살을 좋아하는 느긋하고 다정한 고양이",
      favorites: "창가의 햇살, 바스락거리는 종이봉투",
      memories: "햇볕 좋은 오후, 창가에 나란히 앉아 바깥을 구경하곤 했어.",
      photos: [],
    },
    letters: [
      {
        id: "sample-letter",
        cat_id: "preview-cat",
        direction: "FROM_CAT",
        title: "오늘은 햇살 한 줌을 보낼게",
        content:
          "나의 다정한 집사에게.\n\n창가에 내려앉은 햇살을 보니, 네가 남겨 준 우리의 오후가 떠올랐어. 나란히 앉아 조용히 바깥을 바라보던 그 시간을, 너도 가끔 꺼내 보고 있겠지?\n\n오늘은 따뜻한 차 한 잔을 마시며 잠깐 쉬어 가면 좋겠어. 바쁜 하루 사이에도 네 마음이 포근해지는 순간이 있기를 바라.\n\n우리의 소중한 오후처럼, 오늘 네 곁에도 작은 햇살이 머물기를.\n\n너의 별이가",
        created_at: now.toISOString(),
        delivery_date: now.toISOString().slice(0, 10),
        read_at: null,
      },
      {
        id: "sample-sent",
        cat_id: "preview-cat",
        direction: "TO_CAT",
        title: "별아, 오늘도 네 생각이 났어",
        content:
          "오늘 창가에 햇살이 참 예쁘게 들었어. 나란히 앉아 바깥을 구경하던 우리 오후가 생각났어. 네 덕분에 평범한 날들이 참 따뜻했어. 고마워, 별아.",
        created_at: new Date(now.getTime() - 86400000).toISOString(),
        delivery_date: null,
        read_at: now.toISOString(),
      },
    ],
  };
}
