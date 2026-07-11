// 「今日」を日本時間（JST=UTC+9）で決定する純関数。
// new Date().toISOString().slice(0,10) は UTC 基準のため、日本の深夜0:00〜8:59 は
// まだ前日扱いになり、「今日/今月」を基準にした表示・集計・ファイル名が1日ズレる。
// サーバはUTCで動く前提なので、集計や既定日はここを通して JST に寄せる。

/** JST(UTC+9) の「今日」を YYYY-MM-DD で返す。now を渡せる（テスト用・既定は現在時刻）。 */
export function todayJst(now: Date = new Date()): string {
  // UTCミリ秒に +9時間して、その時刻の UTC 表現の日付部分を取れば JST の暦日になる。
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/** JST(UTC+9) の「今月」を YYYY-MM で返す。 */
export function thisMonthJst(now: Date = new Date()): string {
  return todayJst(now).slice(0, 7);
}
