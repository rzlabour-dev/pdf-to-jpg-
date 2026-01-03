// Global variables
let pdfDoc = null;
let currentPage = 1;
let selectedImages = [];
let pdfJsLib = window['pdfjs-dist/build/pdf'];
pdfJsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
const pdfToImageSection = document.getElementById('pdf-to-image');
const imageToPdfSection = document.getElementById('image-to-pdf');
const typeButtons = document.querySelectorAll('.type-btn');
const pdfUploadArea = document.getElementById('pdf-upload-area');
const pdfInput = document.getElementById('pdf-input');
const imageUploadArea = document.getElementById('image-upload-area');
const imageInput = document.getElementById('image-input');
const convertPdfToImageBtn = document.getElementById('convert-pdf-to-image');
const convertImagesToPdfBtn = document.getElementById('convert-images-to-pdf');
const pdfPreview = document.getElementById('pdf-preview');
const pdfPreviewPlaceholder = document.getElementById('pdf-preview-placeholder');
const pageThumbnails = document.getElementById('page-thumbnails');
const imageList = document.getElementById('image-list');
const pagesToConvert = document.getElementById('pages-to-convert');
const pageRangeInput = document.getElementById('page-range-input');
const imageQuality = document.getElementById('image-quality');
const qualityValue = document.getElementById('quality-value');
const marginSize = document.getElementById('margin-size');
const marginValue = document.getElementById('margin-value');
const downloadAllBtn = document.getElementById('download-all');
const downloadCurrentBtn = document.getElementById('download-current');
const downloadPdfBtn = document.getElementById('download-pdf');
const reorderImagesBtn = document.getElementById('reorder-images');
const clearAllImagesBtn = document.getElementById('clear-all-images');
const pdfDownloadOptions = document.getElementById('pdf-download-options');
const imageDownloadOptions = document.getElementById('image-download-options');

// Initialize the application
function init() {
    // Event listeners for type switching
    typeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const type = button.dataset.type;
            switchConversionType(type);
        });
    });

    // PDF upload handling
    pdfUploadArea.addEventListener('click', () => pdfInput.click());
    pdfUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        pdfUploadArea.style.borderColor = '#6a3093';
        pdfUploadArea.style.background = '#edf2ff';
    });
    pdfUploadArea.addEventListener('dragleave', () => {
        pdfUploadArea.style.borderColor = '#4a6ee0';
        pdfUploadArea.style.background = '#f8faff';
    });
    pdfUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        pdfUploadArea.style.borderColor = '#4a6ee0';
        pdfUploadArea.style.background = '#f8faff';
        
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            handlePdfUpload(file);
        } else {
            showError('Please upload a valid PDF file');
        }
    });
    pdfInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handlePdfUpload(e.target.files[0]);
        }
    });

    // Image upload handling
    imageUploadArea.addEventListener('click', () => imageInput.click());
    imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageUploadArea.style.borderColor = '#6a3093';
        imageUploadArea.style.background = '#edf2ff';
    });
    imageUploadArea.addEventListener('dragleave', () => {
        imageUploadArea.style.borderColor = '#4a6ee0';
        imageUploadArea.style.background = '#f8faff';
    });
    imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadArea.style.borderColor = '#4a6ee0';
        imageUploadArea.style.background = '#f8faff';
        
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('image/')
        );
        if (files.length > 0) {
            handleImageUpload(files);
        } else {
            showError('Please upload valid image files');
        }
    });
    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageUpload(Array.from(e.target.files));
        }
    });

    // Conversion buttons
    convertPdfToImageBtn.addEventListener('click', convertPdfToImages);
    convertImagesToPdfBtn.addEventListener('click', convertImagesToPdf);

    // Download buttons
    downloadAllBtn.addEventListener('click', downloadAllImages);
    downloadCurrentBtn.addEventListener('click', downloadCurrentImage);
    downloadPdfBtn.addEventListener('click', downloadGeneratedPdf);

    // Image list controls
    reorderImagesBtn.addEventListener('click', reorderImages);
    clearAllImagesBtn.addEventListener('click', clearAllImages);

    // Range inputs
    imageQuality.addEventListener('input', () => {
        qualityValue.textContent = imageQuality.value;
    });

    marginSize.addEventListener('input', () => {
        marginValue.textContent = `${marginSize.value}mm`;
    });

    // Pages to convert selection
    pagesToConvert.addEventListener('change', (e) => {
        pageRangeInput.style.display = e.target.value === 'range' ? 'flex' : 'none';
    });

    // Initialize tooltips
    initializeTooltips();
}

// Switch between conversion types
function switchConversionType(type) {
    typeButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-type="${type}"]`).classList.add('active');
    
    pdfToImageSection.classList.remove('active');
    imageToPdfSection.classList.remove('active');
    document.getElementById(type).classList.add('active');
}

// Handle PDF upload
async function handlePdfUpload(file) {
    if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB');
        return;
    }

    try {
        showLoading(pdfUploadArea, 'Loading PDF...');
        
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfJsLib.getDocument({ data: arrayBuffer }).promise;
        
        pdfPreviewPlaceholder.style.display = 'none';
        pdfPreview.style.display = 'block';
        
        document.getElementById('pdf-name').textContent = file.name;
        document.getElementById('page-count').textContent = `Pages: ${pdfDoc.numPages}`;
        
        await renderPageThumbnails();
        convertPdfToImageBtn.disabled = false;
        
        pdfUploadArea.innerHTML = `
            <i class="fas fa-check-circle" style="color: #28a745;"></i>
            <h3>PDF Loaded Successfully!</h3>
            <p>${file.name}</p>
            <p class="file-info">${(file.size / 1024 / 1024).toFixed(2)} MB • ${pdfDoc.numPages} pages</p>
            <button class="change-file-btn">Change File</button>
        `;
        
        pdfUploadArea.querySelector('.change-file-btn').addEventListener('click', () => {
            pdfUploadArea.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <h3>Upload PDF File</h3>
                <p>Drag & drop or click to select a PDF file</p>
                <input type="file" id="pdf-input" accept=".pdf">
                <p class="file-info">Max file size: 10MB</p>
            `;
            pdfInput.addEventListener('change', (e) => {
                if (e.target.files[0]) handlePdfUpload(e.target.files[0]);
            });
        });
        
    } catch (error) {
        console.error('Error loading PDF:', error);
        showError('Failed to load PDF file. Please try again.');
    }
}

// Render PDF page thumbnails
async function renderPageThumbnails() {
    pageThumbnails.innerHTML = '';
    const numPages = Math.min(pdfDoc.numPages, 20); // Limit to 20 pages for preview
    
    for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = 'page-thumbnail';
        thumbnailDiv.innerHTML = `
            <canvas data-page="${i}"></canvas>
            <div class="page-number">Page ${i}</div>
        `;
        
        const thumbnailCanvas = thumbnailDiv.querySelector('canvas');
        thumbnailCanvas.width = canvas.width;
        thumbnailCanvas.height = canvas.height;
        thumbnailCanvas.getContext('2d').drawImage(canvas, 0, 0);
        
        pageThumbnails.appendChild(thumbnailDiv);
    }
}

// Handle image upload
async function handleImageUpload(files) {
    if (selectedImages.length + files.length > 20) {
        showError('Maximum 20 images allowed');
        return;
    }
    
    for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
            showError(`${file.name} is too large (max 5MB)`);
            continue;
        }
        
        const imageData = {
            id: Date.now() + Math.random(),
            file: file,
            url: URL.createObjectURL(file)
        };
        
        selectedImages.push(imageData);
        await addImageToList(imageData);
    }
    
    updateImageListControls();
    convertImagesToPdfBtn.disabled = selectedImages.length === 0;
    imageDownloadOptions.style.display = 'none';
}

// Add image to the list
async function addImageToList(imageData) {
    const img = new Image();
    img.src = imageData.url;
    
    await new Promise(resolve => {
        img.onload = resolve;
        img.onerror = () => {
            showError(`Failed to load ${imageData.file.name}`);
            resolve();
        };
    });
    
    const imageItem = document.createElement('div');
    imageItem.className = 'image-item';
    imageItem.dataset.id = imageData.id;
    imageItem.innerHTML = `
        <img src="${imageData.url}" alt="${imageData.file.name}" class="image-preview">
        <div class="image-info">
            <div class="image-name">${imageData.file.name}</div>
            <div class="image-size">${(imageData.file.size / 1024).toFixed(2)} KB • ${img
