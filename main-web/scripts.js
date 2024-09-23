document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const header = document.querySelector('header');
    const body = document.body;
    const supportForm = document.getElementById('support-form');
    const statusIndicator = document.getElementById('status-indicator');
    const errorMessage = document.getElementById('error-message');
    const notificationContainer = document.createElement('div');
    let lastScrollTop = 0;

    const handleScrollAnimation = () => {
        document.querySelectorAll('.scroll-section').forEach(section => {
            const rect = section.getBoundingClientRect();
            section.classList.toggle('visible', rect.top < window.innerHeight && rect.bottom > 0);
        });
    };

    function setActiveLink(targetId) {
        document.querySelectorAll('nav a').forEach(link => {
            link.classList.remove('active', 'highlight');
            if (link.getAttribute('href') === `#${targetId}`) {
                link.classList.add('active', 'highlight');
                setTimeout(() => link.classList.remove('highlight'), 3000);
            }
        });
    }

        function scrollToSection(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
        const firstSection = document.querySelector('section');
    if (firstSection) {
        scrollToSection(firstSection);
    }

    window.addEventListener('scroll', () => {
        handleScrollAnimation();

        let current = '';
        document.querySelectorAll('section').forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;

            if (scrollY >= (sectionTop - 50) && scrollY < (sectionTop + sectionHeight - 50)) {
                current = section.getAttribute('id');
            }
        });

        setActiveLink(current);

        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        header.classList.toggle('hidden', currentScrollTop > lastScrollTop);
        lastScrollTop = currentScrollTop <= 0 ? 0 : currentScrollTop;
    });

    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            scrollToSection(targetElement);
            setActiveLink(targetId);
        });
    });

    handleScrollAnimation();

    const toggleButton = document.createElement('button');
    toggleButton.classList.add('header-toggle');
    toggleButton.innerHTML = '&#9660;';
    document.body.appendChild(toggleButton);

    toggleButton.addEventListener('click', () => {
        header.classList.toggle('hidden');
        toggleButton.innerHTML = header.classList.contains('hidden') ? '&#9650;' : '&#9660;';
    });

    const darkModeKey = 'gidoBotDarkMode';
    if (localStorage.getItem(darkModeKey) === 'enabled') {
        body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    } else {
        themeToggle.textContent = '🌙';
    }

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        localStorage.setItem(darkModeKey, isDarkMode ? 'enabled' : '');
        themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
    });

    if (supportForm) {
        supportForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const now = new Date().getTime();
            const tenHours = 10 * 60 * 60 * 1000; // 10 hours
            const lastReportTime = parseInt(localStorage.getItem('lastReportTime'), 10) || 0;
            const reportCount = parseInt(localStorage.getItem('reportCount'), 10) || 0;

            if (now - lastReportTime < tenHours) {
                if (reportCount >= 2) {
                    const remainingTime = tenHours - (now - lastReportTime);
                    const hours = Math.floor(remainingTime / (60 * 60 * 1000));
                    const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
                    alert(`You can only report twice every 10 hours. Please try again in ${hours} hour(s) and ${minutes} minute(s).`);
                    return;
                } else {
                    localStorage.setItem('reportCount', reportCount + 1);
                }
            } else {
                localStorage.setItem('reportCount', 1);
                localStorage.setItem('lastReportTime', now);
            }

            const formData = new FormData(supportForm);
            const nickname = formData.get('user-nickname');
            const email = formData.get('user-email');
            const description = formData.get('user-description');

try {
    const response = await fetch('https://gido-bot-web.onrender.com/api/support', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nickname, email, description })
    });

    if (response.status === 401) {
        alert('You are banned.');
        return;
    }

    if (response.ok) {
        alert('Request submitted successfully. You will receive an email within 24 hours.');
        localStorage.setItem('lastReportTime', now.toString());
        supportForm.reset();
    } else {
        alert('Failed to submit report. Please try again later.');
    }
} catch (error) {
    console.error('Error:', error);
    alert('Failed to submit report. Please try again later.');
}

        });
    }


    const showNotification = (message, type) => {
        notificationContainer.className = `notification ${type}`;
        notificationContainer.textContent = message;
        document.body.appendChild(notificationContainer);
        setTimeout(() => notificationContainer.remove(), 5000);
    };

    const checkStatus = async () => {
        const statusIndicator = document.getElementById('status-indicator');
        const errorMessage = document.getElementById('error-message');
        
        try {
            const response = await fetch('https://fetch-bot-fvty.onrender.com/api/status');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.status === 'online') {
                statusIndicator.classList.add('online');
                statusIndicator.style.backgroundColor = '#4CAF50';
                statusIndicator.textContent = 'Online';
            } else {
                statusIndicator.classList.remove('online');
                statusIndicator.style.backgroundColor = '#FF0000'; 
                statusIndicator.textContent = 'Offline';
            }
        } catch (error) {
            console.error('Failed to fetch status:', error);
            statusIndicator.style.backgroundColor = '#FF0000';
            statusIndicator.textContent = 'Error fetching status';
            errorMessage.textContent = 'Unable to check status. Please try again later.';
            const someButton = document.getElementById('someButton');
            const additionalContent = document.getElementById('additionalContent');
            if (someButton) someButton.disabled = true;
            if (additionalContent) additionalContent.style.display = 'none';
        }
    };

    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);
    checkStatus();
});
