// DOM元素
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsContainer = document.getElementById('resultsContainer');
const imagePreview = document.getElementById('imagePreview');
const linksContainer = document.getElementById('linksContainer');
const toast = document.getElementById('toast');

// 弹窗元素
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');

// 自定义下拉框元素
const customSelect = document.getElementById('customSelect');
const selectTrigger = document.getElementById('selectTrigger');
const selectOptions = document.getElementById('selectOptions');
const selectText = selectTrigger.querySelector('.select-text');
const selectDescription = selectTrigger.querySelector('.select-description');
const selectIcon = selectTrigger.querySelector('.select-icon');

// 全局变量
let selectedFile = null;
let selectedDeleteTime = 5; // 默认5分钟
let systemConfig = {
    allowPermanentStorage: true // 默认值，会从API获取
};
let uploadLimitStatus = {
    hasLimit: false,
    remaining: 0,
    dailyLimit: 0
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadSystemConfig();
    loadUploadLimitStatus();
});

// 加载系统配置
async function loadSystemConfig() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            systemConfig = await response.json();
            updatePermanentStorageOption();
        } else {
            console.warn('获取系统配置失败，使用默认配置');
        }
    } catch (error) {
        console.warn('获取系统配置失败:', error);
    }
}

// 更新永久保存选项的显示状态
function updatePermanentStorageOption() {
    const permanentOption = selectOptions.querySelector('.select-option[data-value="0"]');
    if (permanentOption) {
        if (systemConfig.allowPermanentStorage) {
            permanentOption.style.display = '';
        } else {
            permanentOption.style.display = 'none';
            
            // 如果当前选中的是永久保存，切换到默认选项
            if (selectedDeleteTime === 0) {
                const defaultOption = selectOptions.querySelector('.select-option[data-value="5"]');
                if (defaultOption) {
                    selectOption(defaultOption);
                }
            }
        }
    }
}

// 加载上传限制状态
async function loadUploadLimitStatus() {
    try {
        const response = await fetch('/api/upload-limit');
        if (response.ok) {
            uploadLimitStatus = await response.json();
            updateUploadLimitDisplay();
        } else {
            console.warn('获取上传限制状态失败');
        }
    } catch (error) {
        console.warn('获取上传限制状态失败:', error);
    }
}

// 更新上传限制显示
function updateUploadLimitDisplay() {
    if (uploadLimitStatus.hasLimit) {
        // 在页面上显示上传限制信息
        showUploadLimitInfo();
        
        // 如果已达到限制，禁用上传功能
        if (uploadLimitStatus.remaining <= 0) {
            disableUpload();
        }
    }
}

// 显示上传限制信息
function showUploadLimitInfo() {
    const limitInfoContainer = document.getElementById('uploadLimitInfo');
    const limitText = document.getElementById('uploadLimitText');
    
    if (limitInfoContainer && limitText && uploadLimitStatus.hasLimit) {
        const text = uploadLimitStatus.remaining > 0 
            ? `今日剩余上传次数: ${uploadLimitStatus.remaining}/${uploadLimitStatus.dailyLimit}`
            : `今日上传次数已用完 (${uploadLimitStatus.dailyLimit}/${uploadLimitStatus.dailyLimit})`;
        
        limitText.textContent = text;
        limitInfoContainer.style.display = 'block';
    } else if (limitInfoContainer) {
        limitInfoContainer.style.display = 'none';
    }
}

// 禁用上传功能
function disableUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (uploadZone) {
        uploadZone.style.opacity = '0.5';
        uploadZone.style.pointerEvents = 'none';
        uploadZone.style.cursor = 'not-allowed';
        
        // 更新上传区域文本
        const uploadContent = uploadZone.querySelector('h3');
        if (uploadContent) {
            uploadContent.textContent = '今日上传次数已达上限';
        }
        
        const uploadDesc = uploadZone.querySelector('p');
        if (uploadDesc) {
            uploadDesc.textContent = '每日限制 ' + uploadLimitStatus.dailyLimit + ' 次，请明天再试';
        }
    }
    
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.textContent = '今日上传已达上限';
    }
}

// 检查上传限制
function checkUploadLimit() {
    if (uploadLimitStatus.hasLimit && uploadLimitStatus.remaining <= 0) {
        showUploadLimitModal();
        return false;
    }
    return true;
}

// 显示上传限制弹窗
function showUploadLimitModal() {
    const resetTime = new Date(uploadLimitStatus.resetTime);
    const timeString = resetTime.toLocaleString('zh-CN');
    
    showToast(`今日上传次数已达上限 (${uploadLimitStatus.dailyLimit}次)，将在明天 00:00 重置`, 'error');
}

// 事件监听器初始化
function initializeEventListeners() {
    // 上传按钮点击
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // 文件输入改变
    fileInput.addEventListener('change', handleFileSelect);

    // 拖拽事件
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragenter', handleDragEnter);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);

    // 点击上传区域
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    // 弹窗事件
    modalClose.addEventListener('click', hideModal);
    modalCancel.addEventListener('click', hideModal);
    modalConfirm.addEventListener('click', handleModalConfirm);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            hideModal();
        }
    });

    // ESC键关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('show')) {
            hideModal();
        }
    });

    // 自定义下拉框事件
    initCustomSelect();
}

// 拖拽处理
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // 只有当离开的是上传区域本身时才移除样式
    if (!uploadZone.contains(e.relatedTarget)) {
        uploadZone.classList.remove('dragover');
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showToast('请拖拽图片文件！', 'error');
        return;
    }
    
    handleFiles(imageFiles);
}

// 文件选择处理
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

// 文件处理
function handleFiles(files) {
    if (files.length === 0) return;
    
    // 检查上传限制
    if (!checkUploadLimit()) {
        return;
    }
    
    // 验证文件
    const validFiles = [];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    for (const file of files) {
        if (!file.type.startsWith('image/')) {
            showToast(`文件 ${file.name} 不是图片格式`, 'error');
            continue;
        }
        
        if (file.size > maxSize) {
            showToast(`文件 ${file.name} 超过10MB限制`, 'error');
            continue;
        }
        
        validFiles.push(file);
    }
    
    if (validFiles.length === 0) return;
    
    // 选择第一个有效文件并显示弹窗
    selectedFile = validFiles[0];
    showModal();
}

// 文件上传
async function uploadFile(file, deleteTime = 5) {
    try {
        // 显示进度
        showProgress();
        hideResults();
        
        const formData = new FormData();
        formData.append('image', file);
        formData.append('deleteTime', deleteTime);
        
        const xhr = new XMLHttpRequest();
        
        // 进度监听
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                updateProgress(percentComplete, '上传中...');
            }
        });
        
        // 完成监听
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        handleUploadSuccess(response, file);
                    } else {
                        throw new Error(response.error || '上传失败');
                    }
                } catch (error) {
                    handleUploadError(error);
                }
            } else if (xhr.status === 429) {
                // 处理上传限制错误
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    handleUploadLimitError(errorResponse);
                } catch (parseError) {
                    handleUploadError(new Error('今日上传次数已达上限'));
                }
            } else {
                handleUploadError(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
        });
        
        // 错误监听
        xhr.addEventListener('error', () => {
            handleUploadError(new Error('网络错误'));
        });
        
        // 开始上传
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
        
    } catch (error) {
        handleUploadError(error);
    }
}

// 上传成功处理
function handleUploadSuccess(response, file) {
    hideProgress();
    showResults(response, file);
    showToast('上传成功！', 'success');
    
    // 更新上传限制状态
    if (uploadLimitStatus.hasLimit) {
        uploadLimitStatus.remaining = Math.max(0, uploadLimitStatus.remaining - 1);
        uploadLimitStatus.used = uploadLimitStatus.dailyLimit - uploadLimitStatus.remaining;
        updateUploadLimitDisplay();
    }
    
    // 重置文件输入
    fileInput.value = '';
}

// 上传错误处理
function handleUploadError(error) {
    hideProgress();
    showToast(`上传失败: ${error.message}`, 'error');
    
    // 重置文件输入
    fileInput.value = '';
}

// 上传限制错误处理
function handleUploadLimitError(errorResponse) {
    hideProgress();
    
    // 更新本地限制状态
    if (errorResponse.dailyLimit) {
        uploadLimitStatus.dailyLimit = errorResponse.dailyLimit;
        uploadLimitStatus.remaining = 0;
        uploadLimitStatus.used = errorResponse.dailyLimit;
        uploadLimitStatus.hasLimit = true;
        
        // 禁用上传功能
        disableUpload();
    }
    
    // 显示错误信息
    const message = errorResponse.details || errorResponse.error || '今日上传次数已达上限';
    showToast(message, 'error');
    
    // 重置文件输入
    fileInput.value = '';
}

// 显示进度
function showProgress() {
    progressContainer.style.display = 'block';
    updateProgress(0, '准备上传...');
}

// 更新进度
function updateProgress(percent, text) {
    progressFill.style.width = `${percent}%`;
    progressText.textContent = text;
}

// 隐藏进度
function hideProgress() {
    progressContainer.style.display = 'none';
}

// 显示结果
function showResults(response, file) {
    // 创建图片预览
    const imgElement = document.createElement('img');
    imgElement.src = response.urls.direct;
    imgElement.alt = response.originalName;
    imgElement.className = 'preview-img';
    
    const infoElement = document.createElement('div');
    infoElement.className = 'image-info';
    infoElement.innerHTML = `
        <strong>文件名:</strong> ${response.originalName}<br>
        <strong>文件大小:</strong> ${formatFileSize(response.size)}<br>
        <strong>图片ID:</strong> ${response.id}
    `;
    
    imagePreview.innerHTML = '';
    imagePreview.appendChild(imgElement);
    imagePreview.appendChild(infoElement);
    
    // 创建链接
    createLinkItems(response.urls);
    
    // 显示结果容器
    resultsContainer.style.display = 'block';
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

// 隐藏结果
function hideResults() {
    resultsContainer.style.display = 'none';
}

// 创建链接项
function createLinkItems(urls) {
    const linkTypes = [
        { key: 'info', title: '信息页链接', icon: 'fas fa-info-circle' },
        { key: 'direct', title: '图片直链', icon: 'fas fa-link' },
        { key: 'html', title: 'HTML代码', icon: 'fab fa-html5' },
        { key: 'markdown', title: 'Markdown代码', icon: 'fab fa-markdown' }
    ];
    
    linksContainer.innerHTML = '';
    
    linkTypes.forEach(type => {
        const linkItem = createLinkItem(type.title, type.icon, urls[type.key]);
        linksContainer.appendChild(linkItem);
    });
}

// 创建单个链接项
function createLinkItem(title, icon, content) {
    const item = document.createElement('div');
    item.className = 'link-item';
    
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-btn';
    copyButton.innerHTML = '<i class="fas fa-copy"></i> 复制';
    
    // 使用事件监听器而不是onclick属性
    copyButton.addEventListener('click', () => {
        copyToClipboard(copyButton, content);
    });
    
    const linkHeader = document.createElement('div');
    linkHeader.className = 'link-header';
    
    const linkTitle = document.createElement('div');
    linkTitle.className = 'link-title';
    linkTitle.innerHTML = `<i class="${icon}"></i> ${title}`;
    
    const linkContent = document.createElement('div');
    linkContent.className = 'link-content';
    linkContent.textContent = content; // 使用textContent而不是innerHTML避免转义问题
    
    linkHeader.appendChild(linkTitle);
    linkHeader.appendChild(copyButton);
    
    item.appendChild(linkHeader);
    item.appendChild(linkContent);
    
    return item;
}

// 复制到剪贴板
async function copyToClipboard(button, text) {
    try {
        await navigator.clipboard.writeText(text);
        
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> 已复制';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
        
        showToast('已复制到剪贴板', 'success');
    } catch (error) {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        showToast('已复制到剪贴板', 'success');
    }
}

// 显示Toast通知
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 弹窗相关函数
function showModal() {
    modalOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function hideModal() {
    modalOverlay.classList.remove('show');
    document.body.style.overflow = '';
    selectedFile = null;
    
    // 关闭下拉框
    closeSelect();
    
    // 重置文件输入
    fileInput.value = '';
}

function handleModalConfirm() {
    if (!selectedFile) return;
    
    // 获取选中的删除时间
    const deleteTime = selectedDeleteTime;
    
    // 保存文件引用，因为hideModal会清空selectedFile
    const fileToUpload = selectedFile;
    
    // 隐藏弹窗
    hideModal();
    
    // 开始上传
    uploadFile(fileToUpload, deleteTime);
}

function getDeleteTimeText(minutes) {
    if (minutes === 0) return '永不删除';
    if (minutes < 60) return `${minutes}分钟`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}小时`;
    if (minutes < 10080) return `${Math.floor(minutes / 1440)}天`;
    if (minutes < 43200) return `${Math.floor(minutes / 10080)}周`;
    return `${Math.floor(minutes / 43200)}月`;
}

// 自定义下拉框功能
function initCustomSelect() {
    // 点击触发器切换下拉框
    selectTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSelect();
    });

    // 点击选项
    const options = selectOptions.querySelectorAll('.select-option');
    options.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            selectOption(option);
        });
    });

    // 点击外部关闭下拉框
    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target)) {
            closeSelect();
        }
    });

    // 键盘导航
    document.addEventListener('keydown', (e) => {
        if (!customSelect.classList.contains('open')) return;
        
        if (e.key === 'Escape') {
            closeSelect();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateOptions('down');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateOptions('up');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const activeOption = selectOptions.querySelector('.select-option.active');
            if (activeOption) {
                selectOption(activeOption);
            }
        }
    });
}

function toggleSelect() {
    if (customSelect.classList.contains('open')) {
        closeSelect();
    } else {
        openSelect();
    }
}

function openSelect() {
    customSelect.classList.add('open');
    selectOptions.scrollTop = 0;
    
    // 滚动到当前选中的选项
    const activeOption = selectOptions.querySelector('.select-option.active');
    if (activeOption) {
        setTimeout(() => {
            activeOption.scrollIntoView({ block: 'nearest' });
        }, 100);
    }
}

function closeSelect() {
    customSelect.classList.remove('open');
}

function navigateOptions(direction) {
    const options = Array.from(selectOptions.querySelectorAll('.select-option'));
    const currentActive = selectOptions.querySelector('.select-option.active');
    let currentIndex = options.indexOf(currentActive);
    
    if (direction === 'down') {
        currentIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
    } else if (direction === 'up') {
        currentIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
    }
    
    // 移除所有active类
    options.forEach(opt => opt.classList.remove('active'));
    
    // 添加active类到新选项（不更新触发器显示）
    const newActive = options[currentIndex];
    newActive.classList.add('active');
    
    // 滚动到可见区域
    newActive.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function selectOption(option) {
    // 移除所有active类
    const allOptions = selectOptions.querySelectorAll('.select-option');
    allOptions.forEach(opt => opt.classList.remove('active'));
    
    // 添加active类到选中的选项
    option.classList.add('active');
    
    // 获取选项数据
    const value = parseInt(option.dataset.value);
    const icon = option.dataset.icon;
    const text = option.querySelector('.option-text').textContent;
    const description = option.querySelector('.option-description').textContent;
    
    // 更新触发器显示
    selectIcon.className = icon;
    selectText.textContent = text;
    selectDescription.textContent = description;
    
    // 保存选中的值
    selectedDeleteTime = value;
    
    // 关闭下拉框
    closeSelect();
}

// 复制函数不再需要全局暴露，因为现在使用事件监听器 