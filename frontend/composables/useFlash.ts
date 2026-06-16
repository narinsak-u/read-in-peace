export const useFlash = () => {
  const notice = useState<string>('flash-notice', () => '');

  const flash = (message: string) => {
    notice.value = message;
    window.setTimeout(() => {
      notice.value = '';
    }, 2400);
  };

  return {
    notice,
    flash,
  };
};
