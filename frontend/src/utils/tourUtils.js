import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const tourConfig = {
  showProgress: true,
  animate: true,
  popoverClass: 'driverjs-theme-pulse',
  nextBtnText: 'Next',
  prevBtnText: 'Back',
  doneBtnText: 'Got it!',
};

export const startDashboardTour = (force = false) => {
  if (!force && localStorage.getItem('pulse_tour_dashboard') === 'done') {
    return;
  }

  const driverObj = driver({
    ...tourConfig,
    steps: [
      {
        element: '#tour-create-session',
        popover: {
          title: 'Create a Session',
          description: 'Choose a type (like Wordcloud or Poll), enter your question, and start a new session instantly.',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '#tour-active-sessions',
        popover: {
          title: 'Your Active Sessions',
          description: 'Manage your sessions here. Use the icons to download results as CSV, duplicate a session, or delete it.',
          side: 'left',
          align: 'start'
        }
      }
    ],
    onDestroyStarted: () => {
      if (!driverObj.hasNextStep() || force) {
        localStorage.setItem('pulse_tour_dashboard', 'done');
      }
      driverObj.destroy();
    }
  });

  driverObj.drive();
};

export const startLiveTour = (force = false) => {
  if (!force && localStorage.getItem('pulse_tour_live') === 'done') {
    return;
  }

  const driverObj = driver({
    ...tourConfig,
    steps: [
      {
        element: '#tour-join-info',
        popover: {
          title: 'Invite Participants',
          description: 'Share this short code or QR code with your audience so they can join and vote on their smartphones.',
          side: 'bottom',
          align: 'center'
        }
      },
      {
        element: '#tour-admin-controls',
        popover: {
          title: 'Host Controls',
          description: 'Your command center: Pause voting, set a countdown timer, reset answers, hide live results, toggle live reactions (heart icon), or export the data to CSV.',
          side: 'bottom',
          align: 'center'
        }
      }
    ],
    onDestroyStarted: () => {
      if (!driverObj.hasNextStep() || force) {
        localStorage.setItem('pulse_tour_live', 'done');
      }
      driverObj.destroy();
    }
  });

  driverObj.drive();
};
