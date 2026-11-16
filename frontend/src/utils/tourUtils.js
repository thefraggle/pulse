import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import i18n from '../i18n';

const getTourConfig = () => ({
  showProgress: true,
  animate: true,
  popoverClass: 'driverjs-theme-pulse',
  nextBtnText: i18n.t('common.next'),
  prevBtnText: i18n.t('common.back'),
  doneBtnText: i18n.t('common.gotIt'),
});

export const startDashboardTour = (force = false) => {
  if (!force && localStorage.getItem('pulse_tour_dashboard') === 'done') {
    return;
  }

  const driverObj = driver({
    ...getTourConfig(),
    steps: [
      {
        element: '#tour-create-session',
        popover: {
          title: i18n.t('tour.createTitle'),
          description: i18n.t('tour.createDesc'),
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '#tour-active-sessions',
        popover: {
          title: i18n.t('tour.activeTitle'),
          description: i18n.t('tour.activeDesc'),
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
    ...getTourConfig(),
    steps: [
      {
        element: '#tour-join-info',
        popover: {
          title: i18n.t('tour.inviteTitle'),
          description: i18n.t('tour.inviteDesc'),
          side: 'bottom',
          align: 'center'
        }
      },
      {
        element: '#tour-admin-controls',
        popover: {
          title: i18n.t('tour.controlsTitle'),
          description: i18n.t('tour.controlsDesc'),
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
