const path = require('path');
const fs = require('fs');

// Upload course cover image
exports.uploadCourseCoverImage = async (req, res) => {
  try {
    // When using .any(), files are in req.files array
    const file = req.files && req.files.length > 0 
      ? req.files.find(f => f.fieldname === 'coverImage') 
      : null;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const { courseId } = req.body;
    
    if (!courseId) {
      // Delete the uploaded file if courseId is missing
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        message: 'Course ID is required',
      });
    }

    // Generate the relative path (without domain)
    const relativePath = `/uploads/lmsCourseCoverImage/${file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Course cover image uploaded successfully',
      data: {
        filename: file.filename,
        path: relativePath, // Only relative path
        originalName: file.originalname,
        size: file.size,
      },
    });
  } catch (error) {
    console.error('Error uploading course cover image:', error);
    
    // Clean up uploaded file if there's an error
    const file = req.files && req.files.length > 0 
      ? req.files.find(f => f.fieldname === 'coverImage') 
      : null;
    if (file && file.path) {
      try {
        fs.unlinkSync(file.path);
      } catch (unlinkError) {
        console.error('Error deleting file after upload error:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload course cover image',
      error: error.message,
    });
  }
};

// Delete course cover image
exports.deleteCourseCoverImage = async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required',
      });
    }

    const filePath = path.join(
      __dirname,
      '../uploads/lmsCourseCoverImage',
      filename
    );

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      message: 'Course cover image deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting course cover image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete course cover image',
      error: error.message,
    });
  }
};
