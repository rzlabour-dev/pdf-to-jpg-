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

    // Fix: PDF upload handling - ensure file input works
    setupFileUploads();
    
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
}

// Fix: Proper file upload setup
function setupFileUploads() {
    // PDF upload
    pdfUploadArea.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
            pdfInput.click();
        }
    });
    
    pdfUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        pdfUploadArea.style.borderColor = '#6a3093';
        pdfUploadArea.style.background = '#edf2ff';
    });
    
    pdfUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        pdfUploadArea.style.borderColor = '#4a6ee0';
        pdfUploadArea.style.background = '#f8faff';
    });
    
    pdfUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        pdfUploadArea.style.borderColor = '#4a6ee0';
        pdfUploadArea.style.background = '#f8faff';
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type === 'application/pdf') {
                handlePdfUpload(file);
            } else {
                showError('Please upload a valid PDF file');
            }
        }
    });
    
    pdfInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handlePdfUpload(e.target.files[0]);
        }
    });

    // Image upload
    imageUploadArea.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
            imageInput.click();
        }
    });
    
    imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        imageUploadArea.style.borderColor = '#6a3093';
        imageUploadArea.style.background = '#edf2ff';
    });
    
    imageUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        imageUploadArea.style.borderColor = '#4a6ee0';
        imageUploadArea.style.background = '#f8faff';
    });
    
    imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        imageUploadArea.style.borderColor = '#4a6ee0';
        imageUploadArea.style.background = '#f8faff';
        
        if (e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type.startsWith('image/')
            );
            if (files.length > 0) {
                handleImageUpload(files);
            } else {
                showError('Please upload valid image files (JPG, PNG, WebP)');
            }
        }
    });
    
    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            handleImageUpload(files);
        }
    });
}

// Switch between conversion types
function switchConversionType(type) {
    typeButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-type="${type}"]`).classList.add('active');
    
    pdfToImageSection.classList.remove('active');
    imageToPdfSection.classList.remove('active');
    document.getElementById(type).classList.add('active');
    
    // Reset download options when switching
    pdfDownloadOptions.style.display = 'none';
    imageDownloadOptions.style.display = 'none';
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
        
        // Update upload area with success message
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        pdfUploadArea.innerHTML = `
            <i class="fas fa-check-circle" style="color: #28a745; font-size: 4rem;"></i>
            <h3>PDF Loaded Successfully!</h3>
            <p>${file.name}</p>
            <p class="file-info">${fileSize} MB • ${pdfDoc.numPages} pages</p>
            <button class="change-file-btn" style="
                margin-top: 15px;
                padding: 10px 20px;
                background: #4a6ee0;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
            ">Change File</button>
        `;
        
        // Add event listener to change file button
        const changeFileBtn = pdfUploadArea.querySelector('.change-file-btn');
        changeFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetPdfUploadArea();
        });
        
    } catch (error) {
        console.error('Error loading PDF:', error);
        showError('Failed to load PDF file. Please try again.');
        resetPdfUploadArea();
    }
}

// Reset PDF upload area to original state
function resetPdfUploadArea() {
    pdfUploadArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <h3>Upload PDF File</h3>
        <p>Drag & drop or click to select a PDF file</p>
        <input type="file" id="pdf-input" accept=".pdf">
        <p class="file-info">Max file size: 10MB</p>
    `;
    
    // Re-attach event listeners
    const newPdfInput = document.getElementById('pdf-input');
    newPdfInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handlePdfUpload(e.target.files[0]);
        }
    });
    
    // Reset preview
    pdfPreview.style.display = 'none';
    pdfPreviewPlaceholder.style.display = 'flex';
    convertPdfToImageBtn.disabled = true;
    pdfDownloadOptions.style.display = 'none';
    pdfDoc = null;
}

// Render PDF page thumbnails
async function renderPageThumbnails() {
    pageThumbnails.innerHTML = '';
    const numPages = Math.min(pdfDoc.numPages, 12); // Limit to 12 pages for preview
    
    for (let i = 1; i <= numPages; i++) {
        try {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.25 });
            
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
        } catch (error) {
            console.error(`Error rendering page ${i}:`, error);
        }
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
        
        if (!file.type.startsWith('image/')) {
            showError(`${file.name} is not a valid image file`);
            continue;
        }
        
        try {
            const imageData = {
                id: Date.now() + Math.random(),
                file: file,
                url: URL.createObjectURL(file)
            };
            
            selectedImages.push(imageData);
            await addImageToList(imageData);
        } catch (error) {
            console.error('Error processing image:', error);
            showError(`Failed to process ${file.name}`);
        }
    }
    
    updateImageListControls();
    convertImagesToPdfBtn.disabled = selectedImages.length === 0;
}

// Add image to the list
async function addImageToList(imageData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.dataset.id = imageData.id;
            imageItem.innerHTML = `
                <img src="${imageData.url}" alt="${imageData.file.name}" class="image-preview">
                <div class="image-info">
                    <div class="image-name">${imageData.file.name}</div>
                    <div class="image-size">${(imageData.file.size / 1024).toFixed(2)} KB • ${img.naturalWidth}×${img.naturalHeight}</div>
                </div>
                <div class="image-actions">
                    <button class="remove-image" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="move-up" title="Move up">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="move-down" title="Move down">
                        <i class="fas fa-arrow-down"></i>
                    </button>
                </div>
            `;
            
            // Remove empty list message if it exists
            const emptyList = imageList.querySelector('.empty-list');
            if (emptyList) {
                emptyList.remove();
            }
            
            imageList.appendChild(imageItem);
            
            // Add event listeners to buttons
            const removeBtn = imageItem.querySelector('.remove-image');
            const moveUpBtn = imageItem.querySelector('.move-up');
            const moveDownBtn = imageItem.querySelector('.move-down');
            
            removeBtn.addEventListener('click', () => removeImage(imageData.id));
            moveUpBtn.addEventListener('click', () => moveImageUp(imageData.id));
            moveDownBtn.addEventListener('click', () => moveImageDown(imageData.id));
            
            resolve();
        };
        
        img.onerror = () => {
            showError(`Failed to load image: ${imageData.file.name}`);
            resolve();
        };
        
        img.src = imageData.url;
    });
}

// Update image list controls
function updateImageListControls() {
    reorderImagesBtn.disabled = selectedImages.length < 2;
    clearAllImagesBtn.disabled = selectedImages.length === 0;
}

// Remove image from list
function removeImage(id) {
    selectedImages = selectedImages.filter(img => img.id !== id);
    
    const imageItem = document.querySelector(`.image-item[data-id="${id}"]`);
    if (imageItem) {
        imageItem.remove();
    }
    
    // Revoke object URL to prevent memory leak
    const imageData = selectedImages.find(img => img.id === id);
    if (imageData) {
        URL.revokeObjectURL(imageData.url);
    }
    
    // Show empty message if no images
    if (selectedImages.length === 0) {
        imageList.innerHTML = `
            <div class="empty-list">
                <i class="far fa-images"></i>
                <p>No images selected yet</p>
            </div>
        `;
    }
    
    updateImageListControls();
    convertImagesToPdfBtn.disabled = selectedImages.length === 0;
    imageDownloadOptions.style.display = 'none';
}

// Move image up in list
function moveImageUp(id) {
    const index = selectedImages.findIndex(img => img.id === id);
    if (index > 0) {
        // Swap in array
        [selectedImages[index], selectedImages[index - 1]] = [selectedImages[index - 1], selectedImages[index]];
        
        // Update DOM
        const imageItems = Array.from(imageList.querySelectorAll('.image-item'));
        const currentItem = imageItems.find(item => item.dataset.id === id);
        const prevItem = imageItems[index - 1];
        
        if (currentItem && prevItem) {
            imageList.insertBefore(currentItem, prevItem);
        }
    }
}

// Move image down in list
function moveImageDown(id) {
    const index = selectedImages.findIndex(img => img.id === id);
    if (index < selectedImages.length - 1) {
        // Swap in array
        [selectedImages[index], selectedImages[index + 1]] = [selectedImages[index + 1], selectedImages[index]];
        
        // Update DOM
        const imageItems = Array.from(imageList.querySelectorAll('.image-item'));
        const currentItem = imageItems.find(item => item.dataset.id === id);
        const nextItem = imageItems[index + 1];
        
        if (currentItem && nextItem) {
            imageList.insertBefore(nextItem, currentItem);
        }
    }
}

// Reorder images randomly
function reorderImages() {
    // Shuffle array
    for (let i = selectedImages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedImages[i], selectedImages[j]] = [selectedImages[j], selectedImages[i]];
    }
    
    // Update DOM
    imageList.innerHTML = '';
    selectedImages.forEach(imageData => {
        const img = new Image();
        img.src = imageData.url;
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        imageItem.dataset.id = imageData.id;
        imageItem.innerHTML = `
            <img src="${imageData.url}" alt="${imageData.file.name}" class="image-preview">
            <div class="image-info">
                <div class="image-name">${imageData.file.name}</div>
                <div class="image-size">${(imageData.file.size / 1024).toFixed(2)} KB</div>
            </div>
            <div class="image-actions">
                <button class="remove-image" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
                <button class="move-up" title="Move up">
                    <i class="fas fa-arrow-up"></i>
                </button>
                <button class="move-down" title="Move down">
                    <i class="fas fa-arrow-down"></i>
                </button>
            </div>
        `;
        
        const removeBtn = imageItem.querySelector('.remove-image');
        const moveUpBtn = imageItem.querySelector('.move-up');
        const moveDownBtn = imageItem.querySelector('.move-down');
        
        removeBtn.addEventListener('click', () => removeImage(imageData.id));
        moveUpBtn.addEventListener('click', () => moveImageUp(imageData.id));
        moveDownBtn.addEventListener('click', () => moveImageDown(imageData.id));
        
        imageList.appendChild(imageItem);
    });
}

// Clear all images
function clearAllImages() {
    // Revoke all object URLs to prevent memory leaks
    selectedImages.forEach(img => URL.revokeObjectURL(img.url));
    
    selectedImages = [];
    imageList.innerHTML = `
        <div class="empty-list">
            <i class="far fa-images"></i>
            <p>No images selected yet</p>
        </div>
    `;
    
    updateImageListControls();
    convertImagesToPdfBtn.disabled = true;
    imageDownloadOptions.style.display = 'none';
}

// Convert PDF to Images
async function convertPdfToImages() {
    if (!pdfDoc) {
        showError('Please upload a PDF file first');
        return;
    }

    try {
        showLoading(convertPdfToImageBtn, 'Converting...');
        
        const format = document.getElementById('image-format').value;
        const quality = parseInt(imageQuality.value) / 10;
        const scale = parseFloat(document.getElementById('scale-factor').value);
        const pagesOption = document.getElementById('pages-to-convert').value;
        
        let startPage = 1;
        let endPage = pdfDoc.numPages;
        
        if (pagesOption === 'range') {
            startPage = parseInt(document.getElementById('page-start').value) || 1;
            endPage = parseInt(document.getElementById('page-end').value) || pdfDoc.numPages;
            
            if (startPage < 1) startPage = 1;
            if (endPage > pdfDoc.numPages) endPage = pdfDoc.numPages;
            if (startPage > endPage) [startPage, endPage] = [endPage, startPage];
        }
        
        const images = [];
        
        for (let i = startPage; i <= endPage; i++) {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            const imageData = canvas.toDataURL(`image/${format}`, quality);
            images.push({
                data: imageData,
                pageNumber: i,
                format: format
            });
        }
        
        // Show download options
        pdfDownloadOptions.style.display = 'block';
        showSuccess(`${images.length} pages converted successfully!`);
        
    } catch (error) {
        console.error('Conversion error:', error);
        showError('Failed to convert PDF to images');
    } finally {
        convertPdfToImageBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Convert PDF to Images';
    }
}

// Convert Images to PDF
async function convertImagesToPdf() {
    if (selectedImages.length === 0) {
        showError('Please upload at least one image');
        return;
    }

    try {
        showLoading(convertImagesToPdfBtn, 'Creating PDF...');
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        const pageSize = document.getElementById('page-size').value;
        const orientation = document.getElementById('page-orientation').value;
        const margin = parseInt(marginSize.value);
        const quality = document.getElementById('pdf-quality').value;
        
        // Set PDF quality
        let pdfQuality = 1.0;
        if (quality === 'medium') pdfQuality = 0.75;
        if (quality === 'low') pdfQuality = 0.5;
        
        for (let i = 0; i < selectedImages.length; i++) {
            if (i > 0) {
                pdf.addPage();
            }
            
            const img = new Image();
            await new Promise((resolve) => {
                img.onload = resolve;
                img.src = selectedImages[i].url;
            });
            
            let pageWidth, pageHeight;
            
            // Calculate page dimensions
            if (pageSize === 'fit') {
                // Fit to image dimensions (in mm)
                const mmPerInch = 25.4;
                const dpi = 96;
                pageWidth = (img.width / dpi) * mmPerInch;
                pageHeight = (img.height / dpi) * mmPerInch;
            } else {
                // Standard page sizes
                const sizes = {
                    'a4': [210, 297],
                    'letter': [215.9, 279.4],
                    'legal': [215.9, 355.6]
                };
                [pageWidth, pageHeight] = sizes[pageSize] || sizes.a4;
                
                if (orientation === 'landscape') {
                    [pageWidth, pageHeight] = [pageHeight, pageWidth];
                }
            }
            
            // Calculate image dimensions with margins
            const imgWidth = pageWidth - (2 * margin);
            const imgHeight = pageHeight - (2 * margin);
            
            // Add image to PDF
            pdf.addImage(
                img, 
                'JPEG', 
                margin, 
                margin, 
                imgWidth, 
                imgHeight,
                undefined,
                'FAST'
            );
        }
        
        // Save PDF
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Show preview
        const previewCanvas = document.getElementById('pdf-output-preview');
        const context = previewCanvas.getContext('2d');
        
        // Show download options
        imageDownloadOptions.style.display = 'block';
        showSuccess('PDF created successfully!');
        
        // Store PDF blob for download
        window.generatedPdfBlob = pdfBlob;
        
    } catch (error) {
        console.error('PDF creation error:', error);
        showError('Failed to create PDF');
    } finally {
        convertImagesToPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Create PDF from Images';
    }
}

// Download all images as ZIP
async function downloadAllImages() {
    // This would require a more complex implementation with JSZip
    // For now, we'll show a message
    showInfo('ZIP download feature requires additional setup. Please download images individually for now.');
}

// Download current image
function downloadCurrentImage() {
    showInfo('Please select a specific image to download from the preview section.');
}

// Download generated PDF
function downloadGeneratedPdf() {
    if (!window.generatedPdfBlob) {
        showError('No PDF generated yet');
        return;
    }
    
    const pdfName = `converted-${Date.now()}.pdf`;
    const url = URL.createObjectURL(window.generatedPdfBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('PDF download started!');
}

// Utility Functions
function showLoading(element, text) {
    const originalHTML = element.innerHTML;
    element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    element.disabled = true;
    
    // Store original HTML for restoration
    element.dataset.originalHTML = originalHTML;
}

function stopLoading(element) {
    if (element.dataset.originalHTML) {
        element.innerHTML = element.dataset.originalHTML;
        element.disabled = false;
        delete element.dataset.originalHTML;
    }
}

function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showInfo(message) {
    showNotification(message, 'info');
}

function showNotification(message, type) {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="close-notification"><i class="fas fa-times"></i></button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#f8d7da' : type === 'success' ? '#d4edda' : '#d1ecf1'};
        color: ${type === 'error' ? '#721c24' : type === 'success' ? '#155724' : '#0c5460'};
        border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'success' ? '#c3e6cb' : '#bee5eb'};
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.close-notification');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .close-notification {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 0;
        margin-left: 10px;
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
