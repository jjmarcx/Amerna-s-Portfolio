const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.nav-links');

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('is-open');

    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute(
      'aria-label',
      isOpen ? 'Close navigation menu' : 'Open navigation menu'
    );
  });

  document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', () => {
      navigation.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open navigation menu');
    });
  });
}

document.querySelectorAll('.file-input').forEach((input) => {
  input.addEventListener('change', (event) => {
    const category = input.dataset.category;
    uploadFile(category, event);
  });
});

function uploadFile(category, event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = (loadEvent) => {
    const fileObject = {
      id: Date.now(),
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      badgeLabel: getFileExtension(file.name),
      data: loadEvent.target.result,
      date: new Date().toLocaleDateString('en-US')
    };

    if (saveFile(category, fileObject)) {
      renderCategoryFiles(category);
    }

    event.target.value = '';
  };

  reader.onerror = () => {
    alert('The file could not be read.');
  };

  reader.readAsDataURL(file);
}

function getFileExtension(filename) {
  const parts = filename.split('.');

  if (parts.length < 2) {
    return 'FILE';
  }

  return parts.pop().toUpperCase();
}

function getStoredFiles(category) {
  try {
    const data = localStorage.getItem(`archive_${category}`);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Could not read stored files:', error);
    return [];
  }
}

function saveFile(category, fileObject) {
  try {
    const files = getStoredFiles(category);
    files.push(fileObject);

    localStorage.setItem(
      `archive_${category}`,
      JSON.stringify(files)
    );

    return true;
  } catch (error) {
    alert(
      'File could not be saved. It may be too large for localStorage. ' +
      'Try using a smaller file.'
    );

    console.error('Could not save file:', error);
    return false;
  }
}

function renderCategoryFiles(category) {
  const container = document.getElementById(`container-${category}`);

  if (!container) {
    return;
  }

  const files = getStoredFiles(category);

  if (files.length === 0) {
    container.innerHTML = '<p class="empty-msg">No files uploaded yet.</p>';
    return;
  }

  container.innerHTML = files.map((file) => {
    const safeName = escapeHtml(file.name);
    const badge = escapeHtml(file.badgeLabel || 'FILE');

    return `
      <div class="file-item-card">
        <div class="file-item-header">
          <span class="file-badge">${badge}</span>

          <button
            type="button"
            class="delete-btn"
            data-category="${category}"
            data-id="${file.id}"
            title="Delete file">
            &times;
          </button>
        </div>

        <div class="file-info">
          <div class="file-title">${safeName}</div>
          <small>${escapeHtml(file.date || '')}</small>
        </div>

        <button
          type="button"
          class="view-btn"
          data-action="open"
          data-category="${category}"
          data-id="${file.id}">
          Open File
        </button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', () => {
      deleteFile(
        button.dataset.category,
        Number(button.dataset.id)
      );
    });
  });

  container.querySelectorAll('[data-action="open"]').forEach((button) => {
    button.addEventListener('click', () => {
      openStoredFile(
        button.dataset.category,
        Number(button.dataset.id)
      );
    });
  });
}

function openStoredFile(category, id) {
  const files = getStoredFiles(category);
  const file = files.find((item) => item.id === id);

  if (!file) {
    alert('The file could not be found.');
    return;
  }

  openFilePreview(file.data, file.name, file.mimeType);
}

function openStaticFile(filePath, fileName) {
  const extension = getFileExtension(fileName).toLowerCase();

  if (isImage(extension)) {
    openFilePreview(filePath, fileName, `image/${extension}`);
  } else if (extension === 'pdf') {
    openFilePreview(filePath, fileName, 'application/pdf');
  } else {
    openFilePreview(filePath, fileName, '');
  }
}

function openFilePreview(fileSource, fileName, mimeType) {
  const modal = document.getElementById('file-modal');
  const modalBody = document.getElementById('modal-body');
  const modalTitle = document.getElementById('modal-title');

  if (!modal || !modalBody || !modalTitle) {
    alert(
      'The modal is missing. Add #file-modal, #modal-body, and #modal-title to index.html.'
    );
    return;
  }

  const extension = getFileExtension(fileName).toLowerCase();
  const safeName = escapeHtml(fileName);

  modalTitle.textContent = fileName;
  modalBody.innerHTML = '';

  if (isImage(extension) || mimeType.startsWith('image/')) {
    const image = document.createElement('img');

    image.src = fileSource;
    image.alt = fileName;
    image.className = 'modal-image';

    modalBody.appendChild(image);
  } else if (extension === 'pdf' || mimeType === 'application/pdf') {
    const iframe = document.createElement('iframe');

    iframe.src = fileSource;
    iframe.title = fileName;
    iframe.className = 'modal-frame';

    modalBody.appendChild(iframe);
  } else {
    modalBody.innerHTML = `
      <div class="download-message">
        <p>Preview is not available for this file type.</p>
        <a href="${fileSource}" download="${safeName}" class="view-btn">
          Download ${safeName}
        </a>
      </div>
    `;
  }

  modal.classList.remove('hidden');
}

function isImage(extension) {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
}

function closeModal() {
  const modal = document.getElementById('file-modal');

  if (modal) {
    modal.classList.add('hidden');
  }
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal();
  }
});

document.getElementById('file-modal')?.addEventListener('click', (event) => {
  if (event.target.id === 'file-modal') {
    closeModal();
  }
});

let pendingDelete = null;

function deleteFile(category, id) {
  pendingDelete = { category, id };

  const confirmed = window.confirm(
    'Are you sure you want to delete this file?'
  );

  if (!confirmed) {
    pendingDelete = null;
    return;
  }

  const files = getStoredFiles(category);
  const remainingFiles = files.filter((file) => file.id !== id);

  localStorage.setItem(
    `archive_${category}`,
    JSON.stringify(remainingFiles)
  );

  renderCategoryFiles(category);
  pendingDelete = null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

['activities', 'quizzes', 'warlab', 'exams'].forEach((category) => {
  renderCategoryFiles(category);
});