const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const generateThumbnail = async (file) => {
  const ext = path.extname(file.path).toLowerCase();
  const fileName = path.parse(file.filename).name;
  const thumbnailFilename = `${fileName}_thumb.jpg`;
  const thumbnailPath = path.join(path.dirname(file.path), thumbnailFilename);

  try {
    // IMAGE
    if (file.mimetype?.startsWith('image/')) {
      await sharp(file.path)
        .resize({
          width: 150,
          height: 150,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 75 })
        .toFile(thumbnailPath);

      return { thumbnailPath, thumbnailFilename };
    }

    // PDF
    if (file.mimetype === 'application/pdf' || ext === '.pdf') {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

      const data = new Uint8Array(fs.readFileSync(file.path));
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;

      try {
        const page = await pdf.getPage(1);

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
          150 / baseViewport.width,
          150 / baseViewport.height,
        );
        const viewport = page.getViewport({ scale });

        const canvasFactory = pdf.canvasFactory;
        const { canvas, context } = canvasFactory.create(
          Math.ceil(viewport.width),
          Math.ceil(viewport.height),
        );

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: context,
          canvas,
          viewport,
        }).promise;

        const png = canvas.toBuffer('image/png');
        await sharp(png).jpeg({ quality: 75 }).toFile(thumbnailPath);

        page.cleanup();
        canvasFactory.destroy({ canvas, context });
      } finally {
        await loadingTask.destroy();
      }

      return { thumbnailPath, thumbnailFilename };
    }

    return {
      thumbnailPath: null,
      thumbnailFilename: null,
    };
  } catch (error) {
    console.error(
      `Thumbnail generation failed for ${file?.path || file?.filename}:`,
      error,
    );

    return {
      thumbnailPath: null,
      thumbnailFilename: null,
    };
  }
};

module.exports = { generateThumbnail };
