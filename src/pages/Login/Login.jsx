import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";

const Login = () => {
  const [fileName, setFileName] = useState(null);
  const [files, setFiles] = useState([]); // array of { file, url }
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [scale, setScale] = useState(2);
  const [originalSize, setOriginalSize] = useState(null);
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(0.92);
  const [mode, setMode] = useState('scale'); // 'scale' | 'preset' | 'custom'
  const [preset, setPreset] = useState('1920x1080');
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);

  useEffect(() => {}, []);

  const computeTarget = (imgWidth, imgHeight) => {
    if (mode === 'scale') {
      return { w: Math.round(imgWidth * scale), h: Math.round(imgHeight * scale) };
    }
    if (mode === 'preset') {
      const [pw, ph] = preset.split('x').map((n) => Number(n));
      return { w: pw, h: ph };
    }
    // custom
    const cw = Number(customW) || imgWidth;
    const ch = Number(customH) || imgHeight;
    return { w: Math.round(cw), h: Math.round(ch) };
  };

  const loadAndProcess = async (index) => {
    const entry = files[index];
    if (!entry) return;
    setSelectedIndex(index);
    setFileName(entry.file.name);
    const imgBitmap = await createImageBitmap(entry.file);
    setOriginalSize({ w: imgBitmap.width, h: imgBitmap.height });
    // draw original
    const ocanvas = originalCanvasRef.current;
    ocanvas.width = imgBitmap.width;
    ocanvas.height = imgBitmap.height;
    const octx = ocanvas.getContext("2d");
    octx.clearRect(0, 0, ocanvas.width, ocanvas.height);
    octx.drawImage(imgBitmap, 0, 0);
    // upscale according to current mode
    const target = computeTarget(imgBitmap.width, imgBitmap.height);
    await upscaleToCanvas(imgBitmap, target, canvasRef.current);
  };

  const handleFileChange = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    if (selected.length > 10) {
      alert('Please select up to 10 images. Only the first 10 will be used.');
    }
    const limited = selected.slice(0, 10);
    const mapped = limited.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setFiles(mapped);
    // process first image immediately
    setTimeout(() => loadAndProcess(0), 0);
  };

  // upscale with iterative doubling for better quality
  async function upscaleToCanvas(imgBitmap, target, outCanvas) {
    const targetW = Math.round(target.w);
    const targetH = Math.round(target.h);

    // start from bitmap
    let src = imgBitmap;

    // If scaleFactor is not power of two, we'll iteratively scale by up to 2x steps
    let currentW = src.width;
    let currentH = src.height;

    // create an intermediate canvas
    const offscreen = document.createElement("canvas");
    const ctx = offscreen.getContext("2d");

    while (currentW < targetW || currentH < targetH) {
      const nextW = Math.min(currentW * 2, targetW);
      const nextH = Math.min(currentH * 2, targetH);
      offscreen.width = nextW;
      offscreen.height = nextH;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, nextW, nextH);
      ctx.drawImage(src, 0, 0, currentW, currentH, 0, 0, nextW, nextH);

      // convert to ImageBitmap for next iteration
      src = await createImageBitmap(offscreen);
      currentW = src.width;
      currentH = src.height;
    }

    // final draw to output canvas
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const outCtx = outCanvas.getContext("2d");
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";
    outCtx.clearRect(0, 0, targetW, targetH);
    outCtx.drawImage(src, 0, 0, targetW, targetH);
  }

  const handleScaleChange = async (e) => {
    const s = Number(e.target.value);
    setScale(s);
    // if there's an image in original canvas, upscale it
    const ocanvas = originalCanvasRef.current;
    if (ocanvas.width > 0 && ocanvas.height > 0) {
      const bitmap = await createImageBitmap(ocanvas);
      const target = computeTarget(bitmap.width, bitmap.height);
      await upscaleToCanvas(bitmap, target, canvasRef.current);
    }
  };

  const handleModeChange = async (e) => {
    setMode(e.target.value);
    const ocanvas = originalCanvasRef.current;
    if (ocanvas.width > 0 && ocanvas.height > 0) {
      const bitmap = await createImageBitmap(ocanvas);
      const target = computeTarget(bitmap.width, bitmap.height);
      await upscaleToCanvas(bitmap, target, canvasRef.current);
    }
  };

  const handlePresetChange = async (e) => {
    setPreset(e.target.value);
    const ocanvas = originalCanvasRef.current;
    if (ocanvas.width > 0 && ocanvas.height > 0) {
      const bitmap = await createImageBitmap(ocanvas);
      const target = computeTarget(bitmap.width, bitmap.height);
      await upscaleToCanvas(bitmap, target, canvasRef.current);
    }
  };

  const handleCustomChange = async () => {
    const ocanvas = originalCanvasRef.current;
    if (ocanvas.width > 0 && ocanvas.height > 0) {
      const bitmap = await createImageBitmap(ocanvas);
      const target = computeTarget(bitmap.width, bitmap.height);
      await upscaleToCanvas(bitmap, target, canvasRef.current);
    }
  };

  const handleDownload = () => {
    const outCanvas = canvasRef.current;
    if (!outCanvas) return;
    const mime = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
    outCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === 'jpeg' ? 'jpg' : format;
      const base = fileName ? fileName.replace(/\.[^/.]+$/, "") : 'upscaled-image';
      a.download = `${base}_${outCanvas.width}x${outCanvas.height}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, mime, quality);
  };

  return (
    <Box p={3}>
      <Typography variant="h4" mb={2} fontWeight={700}>
        Image Upscaler Dashboard
      </Typography>
      <Grid container spacing={2} alignItems="flex-start">
        <Grid item xs={12}>
          <Box display="flex" flexDirection="column" gap={2}>
            <input
              ref={inputRef}
              accept="image/*"
              style={{ display: 'none' }}
              id="image-upload"
              type="file"
              multiple
              onChange={handleFileChange}
            />
            <Box
              onClick={() => inputRef.current && inputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                  // reuse existing handler by faking an event
                  handleFileChange({ target: { files: e.dataTransfer.files } });
                }
              }}
              tabIndex={0}
              role="button"
              sx={{
                border: dragActive ? '2px dashed #1976d2' : '2px dashed #ddd',
                bgcolor: dragActive ? '#f5faff' : '#fafafa',
                p: 4,
                borderRadius: 1,
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <Typography variant="body1" mb={1}>
                Click or drag images here (max 10)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supported: PNG, JPEG, WEBP
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle1" mb={1}>Resize Mode</Typography>
              <RadioGroup row value={mode} onChange={handleModeChange}>
                <FormControlLabel value="scale" control={<Radio />} label="Scale" />
                <FormControlLabel value="preset" control={<Radio />} label="Preset" />
                <FormControlLabel value="custom" control={<Radio />} label="Custom" />
              </RadioGroup>

              {mode === 'scale' && (
                <FormControl fullWidth>
                  <InputLabel id="scale-label">Scale</InputLabel>
                  <Select
                    labelId="scale-label"
                    value={scale}
                    label="Scale"
                    onChange={handleScaleChange}
                  >
                    <MenuItem value={1}>1x (no change)</MenuItem>
                    <MenuItem value={2}>2x</MenuItem>
                    <MenuItem value={3}>3x</MenuItem>
                    <MenuItem value={4}>4x</MenuItem>
                  </Select>
                </FormControl>
              )}

              {mode === 'preset' && (
                <FormControl fullWidth>
                  <InputLabel id="preset-label">Preset Resolution</InputLabel>
                  <Select
                    labelId="preset-label"
                    value={preset}
                    label="Preset Resolution"
                    onChange={handlePresetChange}
                  >
                    <MenuItem value={'3840x2160'}>4K (3840 x 2160)</MenuItem>
                    <MenuItem value={'2560x1440'}>2K (2560 x 1440)</MenuItem>
                    <MenuItem value={'1920x1080'}>Full HD (1920 x 1080)</MenuItem>
                    <MenuItem value={'1280x720'}>HD (1280 x 720)</MenuItem>
                    <MenuItem value={'1024x1024'}>Square 1024 x 1024</MenuItem>
                  </Select>
                </FormControl>
              )}

              {mode === 'custom' && (
                <Box display="flex" gap={1} mt={1}>
                  <TextField
                    label="Width"
                    type="number"
                    value={customW}
                    onChange={(e) => setCustomW(e.target.value)}
                    onBlur={handleCustomChange}
                    fullWidth
                  />
                  <TextField
                    label="Height"
                    type="number"
                    value={customH}
                    onChange={(e) => setCustomH(e.target.value)}
                    onBlur={handleCustomChange}
                    fullWidth
                  />
                </Box>
              )}
            </Box>

            <FormControl fullWidth>
              <InputLabel id="format-label">Output Type</InputLabel>
              <Select
                labelId="format-label"
                value={format}
                label="Output Type"
                onChange={(e) => setFormat(e.target.value)}
              >
                <MenuItem value={'png'}>PNG</MenuItem>
                <MenuItem value={'jpeg'}>JPEG</MenuItem>
                <MenuItem value={'webp'}>WEBP</MenuItem>
              </Select>
            </FormControl>

            {format !== 'png' && (
              <Box>
                <Typography variant="body2" gutterBottom>
                  Quality: {Math.round(quality * 100)}%
                </Typography>
                <Slider
                  value={quality}
                  min={0.1}
                  max={1}
                  step={0.01}
                  onChange={(_, v) => setQuality(v)}
                />
              </Box>
            )}

            {files.length > 0 && (
              <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                {files.map((f, i) => (
                  <Box
                    key={i}
                    onClick={() => loadAndProcess(i)}
                    sx={{
                      border: i === selectedIndex ? '2px solid #1976d2' : '1px solid #ddd',
                      cursor: 'pointer',
                      width: 72,
                      height: 72,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#fff'
                    }}
                  >
                    <img src={f.url} alt={f.file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                ))}
              </Box>
            )}

            <Button variant="outlined" onClick={handleDownload} disabled={!fileName}>
              Download Upscaled Image
            </Button>

            {originalSize && (
              <Typography color="text.secondary">
                Original: {originalSize.w} x {originalSize.h}
              </Typography>
            )}
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography fontWeight={600}>Original</Typography>
              <Box
                sx={{ border: '1px solid #ddd', mt: 1 }}
                display="flex"
                justifyContent="center"
                alignItems="center"
              >
                <canvas ref={originalCanvasRef} style={{ maxWidth: '100%' }} />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography fontWeight={600}>Upscaled</Typography>
              <Box
                sx={{ border: '1px solid #ddd', mt: 1 }}
                display="flex"
                justifyContent="center"
                alignItems="center"
              >
                <canvas ref={canvasRef} style={{ maxWidth: '100%' }} />
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Login;
