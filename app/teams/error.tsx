"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ padding: 24 }}>
      <h2>驛｢・ｧ繝ｻ・ｨ驛｢譎｢・ｽ・ｩ驛｢譎｢・ｽ・ｼ驍ｵ・ｺ隶吩ｸｻ鬨馴ｨｾ蠅難ｽｺ蛛・ｽｼ・ｰ驍ｵ・ｺ繝ｻ・ｾ驍ｵ・ｺ陷会ｽｱ隨ｳ繝ｻ/h2>
      <pre>{error.message}</pre>
      <button onClick={() => reset()}>髯ｷﾂ陝雜｣・ｽ・ｩ繝ｻ・ｦ鬮ｯ・ｦ郢晢ｽｻ/button>
    </main>
  );
}
