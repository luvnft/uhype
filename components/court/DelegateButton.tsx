import { Dialog } from "@headlessui/react";
import { useQueryClient } from "@tanstack/react-query";
import { ZTG } from "@zeitgeistpm/sdk";
import Avatar from "components/ui/Avatar";
import FormTransactionButton from "components/ui/FormTransactionButton";
import Input from "components/ui/Input";
import Modal from "components/ui/Modal";
import SecondaryButton from "components/ui/SecondaryButton";
import Decimal from "decimal.js";
import { useConnectedCourtParticipant } from "lib/hooks/queries/court/useConnectedCourtParticipant";
import { courtParticipantsRootKey } from "lib/hooks/queries/court/useCourtParticipants";
import { useChainConstants } from "lib/hooks/queries/useChainConstants";
import { useZtgBalance } from "lib/hooks/queries/useZtgBalance";
import { useSdkv2 } from "lib/hooks/useSdkv2";
import { useNotifications } from "lib/state/notifications";
import { useWallet } from "@solana/wallet-adapter-react";
import { shortenAddress } from "lib/util";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

const DelegateButton = ({ address }: { address: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const constants = useChainConstants();
  const {
    register,
    handleSubmit,
    getValues,
    formState,
    watch,
    setValue,
    trigger,
  } = useForm({
    reValidateMode: "onChange",
    mode: "onChange",
  });
  const [sdk, id] = useSdkv2();
  const notificationStore = useNotifications();
  const { publicKey } = useWallet();
  const { data: freeZtgBalance } = useZtgBalance(publicKey?.toString());
  const connectedParticipant = useConnectedCourtParticipant();
  const queryClient = useQueryClient();

  const balance = useMemo(() => {
    return new Decimal(freeZtgBalance ?? 0).plus(
      connectedParticipant?.stake ?? 0,
    );
  }, [freeZtgBalance, connectedParticipant?.stake]);

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      const changedByUser = type != null;

      if (!changedByUser || !balance) return;

      if (name === "percentage") {
        setValue(
          "amount",
          balance.mul(value.percentage).div(100).div(ZTG).toNumber(),
        );
      } else if (name === "amount" && value.amount !== "") {
        setValue(
          "percentage",
          new Decimal(value.amount).mul(ZTG).div(balance).mul(100).toString(),
        );
      }
      trigger("amount");
    });
    return () => subscription.unsubscribe();
  }, [watch, balance]);

  const onSubmit = () => {
    // send();
  };

  return (
    <>
      <SecondaryButton onClick={() => setIsOpen(true)}>
        Delegate
      </SecondaryButton>
      <Modal open={isOpen} onClose={() => setIsOpen(false)}>
        <Dialog.Panel className="w-full max-w-[564px] rounded-[10px] bg-white p-[30px]">
          <h3 className="mb-8">Delegate to</h3>
          <div className="flex items-center gap-2 text-xxs">
            <Avatar address={address} />
            <span>{address}</span>
          </div>
          <div className="mt-[20px] flex w-full flex-col items-center gap-8 text-ztg-18-150 font-semibold">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex w-full flex-col items-center"
            >
              <div className="center relative h-[56px] w-full bg-anti-flash-white text-ztg-18-150 font-normal">
                <Input
                  type="number"
                  className="w-full bg-transparent !text-center outline-none"
                  step="any"
                  {...register("amount", {
                    value: 0,
                    required: {
                      value: true,
                      message: "Value is required",
                    },
                    validate: (value) => {
                      if (value > (balance?.div(ZTG).toNumber() ?? 0)) {
                        return `Insufficient balance. Current balance: ${balance
                          ?.div(ZTG)
                          .toFixed(3)}`;
                      } else if (value <= 0) {
                        return "Value cannot be zero or less";
                      } else if (
                        constants?.court.minJurorStake &&
                        value < constants?.court.minJurorStake
                      ) {
                        return `Stake cannot be less than ${constants?.court.minJurorStake} ${constants.tokenSymbol}`;
                      } else if (
                        connectedParticipant?.stake &&
                        connectedParticipant?.stake.div(ZTG).greaterThan(value)
                      ) {
                        return `Stake must be higher than your current stake of ${connectedParticipant?.stake
                          .div(ZTG)
                          .toNumber()} ${constants?.tokenSymbol}`;
                      }
                    },
                  })}
                />
                <div className="absolute right-0 mr-[10px]">
                  {constants?.tokenSymbol}
                </div>
              </div>
              <input
                className="mb-[10px] mt-[30px] w-full"
                type="range"
                disabled={!balance || balance.lessThanOrEqualTo(0)}
                {...register("percentage", { value: "0" })}
              />
              <div className="my-[4px] h-[16px] text-ztg-12-120 text-vermilion">
                <>{formState.errors["amount"]?.message}</>
              </div>
              <div className="center mb-[10px] text-ztg-12-120 font-normal text-sky-600">
                <span className="ml-1 text-black">
                  Network Fee: {0} {"SOL"}
                </span>
              </div>
              <FormTransactionButton
                loading={true}
                className="w-full max-w-[250px]"
                disabled={formState.isValid === false}
              >
                Delegate
              </FormTransactionButton>
            </form>
          </div>
        </Dialog.Panel>
      </Modal>
    </>
  );
};

export default DelegateButton;
