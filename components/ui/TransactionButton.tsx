import { ISubmittableResult } from "@polkadot/types/types";
import { useUserLocation } from "lib/hooks/useUserLocation";
import { useAccountModals } from "lib/state/account";
import { useWallet } from "@solana/wallet-adapter-react";
import { FC, PropsWithChildren, useMemo } from "react";
import { Loader } from "./Loader";
import { useState } from "react";

interface TransactionButtonProps {
  preventDefault?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  dataTest?: string;
  type?: "button" | "submit" | "reset";
  disableFeeCheck?: boolean;
  loading?: boolean;
  connectText?: string;
}

const TransactionButton: FC<PropsWithChildren<TransactionButtonProps>> = ({
  onClick,
  disabled = false,
  className = "",
  dataTest = "",
  children,
  preventDefault,
  type = "button",
  disableFeeCheck = false,
  connectText = "Connect Wallet",
  loading,
}) => {
  const { publicKey } = useWallet();
  const pubKey = publicKey?.toString() ?? "";
  const accountModals = useAccountModals();
  // const { locationAllowed } = useUserLocation();

  const [isHovered, setIsHovered] = useState(false);

  const click = (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    console.log("vcl");
    onClick?.();
    if (preventDefault) {
      event?.preventDefault();
    }
    if (!pubKey) {
      accountModals.openWalletSelect();
    } else {
      onClick && onClick();
    }
  };

  const isDisabled = useMemo(() => {
    if (!publicKey) {
      return false;
    }
    return disabled;
  }, [pubKey]);

  const colorClass = "bg-vermilion";

  const getButtonChildren = () => {
    if (loading) {
      return (
        <div className="center w-full rounded-full bg-inherit">
          <Loader variant={"Dark"} className="z-20 h-6 w-6" loading />
        </div>
      );
    } else if (pubKey) {
      return children;
    } else {
      return connectText;
    }
  };

  return (
    <>
      {publicKey && (
        <button
          type={type}
          className={`ztg-transition h-[48px] w-[128px] rounded-xl
           focus:outline-none disabled:cursor-default ${
             !isDisabled ? "active:scale-95" : ""
           } ${className} disabled:!bg-dark-300 h-[54px] w-[248px] px-[12px] py-[12px] text-[14px] font-bold`}
          style={{
            backgroundColor: "#00fc81", // Màu nền xanh lá cây
            color: "#00794c", // Màu chữ xanh lá đậm
            opacity: isHovered ? 0.8 : 1, // Thay đổi độ mờ khi hover
          }}
          onMouseEnter={() => setIsHovered(true)} // Khi di chuột vào
          onMouseLeave={() => setIsHovered(false)} // Khi di chuột ra
          onClick={(e) => click(e)}
          disabled={isDisabled}
          data-test={dataTest}
        >
          {getButtonChildren()}
        </button>
      )}
    </>
  );
};

export default TransactionButton;
