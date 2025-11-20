import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// 1. ป๊อปอัพยืนยัน (Confirm)
export const confirmAction = async (title: string, text: string, confirmButtonText: string = 'ยืนยัน', confirmColor: string = '#D32F2F') => {
  const result = await MySwal.fire({
    title: title,
    text: text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: confirmColor,
    cancelButtonColor: '#9E9E9E',
    confirmButtonText: confirmButtonText,
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true,
    focusCancel: true,
    customClass: { popup: 'rounded-xl' }
  });
  return result.isConfirmed;
};

// 2. ป๊อปอัพสำเร็จ (Success)
export const showSuccess = (title: string, text: string = '') => {
  return MySwal.fire({
    title: title,
    text: text,
    icon: 'success',
    confirmButtonColor: '#2E7D32',
    timer: 2000,
    timerProgressBar: true,
  });
};

// 3. ป๊อปอัพผิดพลาด (Error)
export const showError = (title: string, text: string) => {
  return MySwal.fire({
    title: title,
    text: text,
    icon: 'error',
    confirmButtonColor: '#D32F2F',
  });
};