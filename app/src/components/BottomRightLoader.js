export default function BottomRightLoader() {
  const wrapper = {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "60px",
    height: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  };

  const spinner = {
    width: "100%",
    height: "100%",
    position: "relative",
    animation: "spin 1s linear infinite",
  };

  const bar = (i) => ({
    position: "absolute",
    width: "10px",
    height: "28px",
    background: "#fff",
    left: "50%",
    top: "50%",
    transformOrigin: "center -10px",
    transform: `rotate(${i * 36}deg) translate(-50%, -50%)`,
  });

  return (
    <>
      <div style={wrapper}>
        <div style={spinner}>
          {[...Array(10)].map((_, i) => (
            <div key={i} style={bar(i)} />
          ))}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
}
