
// @returns <MediaStreamTrack>
export default function canvasStream(canvas, word) {
  let ctx = canvas.getContext('2d');
  ctx.fillStyle = 'green';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // const wordWidth = ctx.measureText(word).width;
  let r = 0;
  requestAnimationFrame(function animate() {
    r += Math.PI / 180;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(r);
    ctx.font = '30px Verdana';
    ctx.textAlign = 'center';
    ctx.fillText(word, 0, 0);
    ctx.restore();
    requestAnimationFrame(animate);
  });
  const stream = canvas.captureStream(10);
  return stream.getTracks()[0];
}
