import { Dialog } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import { IOZtgAssetId } from "@zeitgeistpm/sdk";
import { StorageError } from "@zeitgeistpm/web3.storage";
import Modal from "components/ui/Modal";
import TransactionButton from "components/ui/TransactionButton";
import Decimal from "decimal.js";
import {
  getMetadataForCurrency,
  supportedCurrencies,
} from "lib/constants/supported-currencies";
import { checkMarketExists } from "lib/gql/markets";
import { useChainConstants } from "lib/hooks/queries/useChainConstants";
import { useFeePayingAsset } from "lib/hooks/queries/useFeePayingAsset";
import { MarketDraftEditor } from "lib/state/market-creation/editor";
import { NotificationType, useNotifications } from "lib/state/notifications";
import { assetsAreEqual } from "lib/util/assets-are-equal";
import { formatNumberCompact } from "lib/util/format-compact";
import { isArray } from "lodash-es";
import { useRouter } from "next/router";
import { useState } from "react";
import { LuFileWarning } from "react-icons/lu";
import { RiSendPlaneLine } from "react-icons/ri";
import { CreateMarketParams } from "lib/state/market-creation/types/form";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMarketProgram } from "@/src/hooks";
import { getExplorerUrl } from "@/lib/util";
import { BN } from "@coral-xyz/anchor";

export type PublishingProps = {
  editor: MarketDraftEditor;
  creationParams?: CreateMarketParams;
};

export const Publishing = ({ editor, creationParams }: PublishingProps) => {
  const { createMarket } = useMarketProgram();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const pubKey = publicKey?.toString() ?? "";
  const router = useRouter();
  const notifications = useNotifications();
  const [isTransacting, setIsTransacting] = useState(false);
  const [totalCostIsOpen, setTotalCostIsOpen] = useState(false);
  const constants = useChainConstants();

  const feesEnabled = !(!creationParams || !editor.isValid || !publicKey);

  const { data: baseFee } = useQuery(
    [creationParams?.metadata, publicKey],
    async () => {
      return new Decimal(0);
      // const paymentInfo =
      //   await sdk.model.markets.create.calculateFees(creationParams);
      // return new Decimal(paymentInfo.partialFee.toString() ?? 0).div(ZTG);
    },
    {
      initialData: new Decimal(0),
      enabled: feesEnabled,
    },
  );

  const { data: feeDetails } = useFeePayingAsset(baseFee);

  const firstInvalidStep = editor.steps.find((step) => !step.isValid);

  const baseCurrency = supportedCurrencies.find(
    (a) => a.name === editor.form.currency,
  );

  let hasEnoughLiquidty = true;

  const bondCost = 0;
  // editor.form.moderation === "Permissionless"
  //   ? constants?.markets.validityBond
  //   : constants?.markets.advisoryBond;

  const oracleBond = constants?.markets.oracleBond;

  const ztgTransactionFee = IOZtgAssetId.is(feeDetails?.assetId)
    ? feeDetails?.amount
    : new Decimal(0);

  const ztgCost = new Decimal(bondCost ?? 0);
  // .plus(oracleBond ?? 0)
  // .plus(
  //   editor.form.moderation === "Permissionless" &&
  //     editor.form.liquidity?.deploy &&
  //     editor.form.currency === "ZTG"
  //     ? new Decimal(editor.form.liquidity.amount || 0).toNumber()
  //     : 0,
  // )
  // .plus(ztgTransactionFee ?? 0);

  const baseCurrencyMetadata =
    editor.form.currency && getMetadataForCurrency(editor.form.currency);

  const baseAssetTransactionFee = assetsAreEqual(
    baseCurrencyMetadata?.assetId,
    feeDetails?.assetId,
  )
    ? feeDetails?.amount
    : new Decimal(0);

  const foreignCurrencyCost = null;
  //    editor.form.liquidity?.deploy && editor.form.currency !== "ZTG"
  // ? new Decimal(editor.form.liquidity.amount || 0)
  // .mul(2)
  // .plus(baseAssetTransactionFee ?? 0)

  const foreignAssetBalanceDelta = foreignCurrencyCost;

  const handleCreateMarket = async () => {
    console.log("Creating market with params:", creationParams);
    if (!creationParams) return;
    const { description, question: title, tags } = creationParams?.metadata;
    if (!publicKey) {
      alert("Please connect your wallet!");
      return;
    }
    try {
      // Create the market using the hook's createMarket mutation
      const { signature } = await createMarket.mutateAsync({
        title: title ?? "Will SOL reached 1000$ at the end of this year?",
        description,
        coverUrl:
          "https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png",
        answers: ["Yes", "No"],
        serviceFeePercentage: new BN(0.3),
        creatorFeePercentage: new BN(1),
      });

      const explorerUrl = getExplorerUrl(signature, "devnet"); // Replace "devnet" with "mainnet-beta" for production

      // Notify the user of success with a clickable transaction link
      notifications.pushNotification(
        <>
          Market created successfully! View the transaction on{" "}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#007bff",
              fontWeight: "bold",
              textDecoration: "underline",
            }}
          >
            Explorer
          </a>
          .
        </>,
        {
          autoRemove: true,
          type: "Success",
          lifetime: 15,
        },
      );
    } catch (error) {
      console.error("Error creating market:", error);
      notifications.pushNotification("Failed to create market.", {
        autoRemove: true,
        type: "Error",
        lifetime: 15,
      });
    }
  };

  const submit = async () => {
    console.log("before", { creationParams });
    if (creationParams) {
      setIsTransacting(true);
      console.log("Creating market with params:", creationParams);
      try {
        notifications.pushNotification("Transacting...", {
          autoRemove: true,
          type: "Info",
          lifetime: 60,
        });
        handleCreateMarket();
        // const result = await sdk.model.markets.create(
        //   creationParams,
        //   IOForeignAssetId.is(feeDetails?.assetId)
        //     ? feeDetails?.assetId
        //     : undefined,
        // );

        // const { market } = result.saturate().unwrap();
        // const marketId = market.marketId;

        // editor.published(marketId);

        notifications.pushNotification(
          "Transaction is being processed! Thank you for your patience",
          {
            autoRemove: true,
            type: "Info",
            lifetime: 60,
          },
        );

        // const indexedStatus = await poll(
        //   async () => {
        //     return checkMarketExists(sdk.indexer.client, marketId);
        //   },
        //   {
        //     intervall: 1000,
        //     timeout: 6 * 1000,
        //   },
        // );

        // if (indexedStatus === PollingTimeout) {
        //   // router.push(`/markets/await/${marketId}`);
        // } else {
        //   notifications.pushNotification(
        //     "Market has been created and indexed! Redirecting to market page.",
        //     {
        //       autoRemove: true,
        //       type: "Success",
        //       lifetime: 15,
        //     },
        //   );

        //   router.push(`/markets/${marketId}`);
        // }

        setTimeout(() => {
          editor.reset();
        }, 2000);
      } catch (error) {
        let type: NotificationType = "Error";
        let errorMessage = "Unknown error occurred.";

        if (StorageError.is(error)) {
          errorMessage = error?.message ?? "IPFS metadata upload failed.";
        }

        if (isArray(error?.docs)) {
          errorMessage = error.docs[0];
        }

        if (error?.message === "Cancelled") {
          type = "Info";
          errorMessage = "Transaction cancelled";
        }

        notifications.pushNotification(errorMessage, {
          autoRemove: true,
          type: type,
          lifetime: 15,
        });

        console.error(error);
      }

      setIsTransacting(false);
    }
  };

  return (
    <>
      <div className="">
        <div className="center mb-6 inline-block">
          <div className="center mb-2 w-full">
            <div className="relative">
              <div className="relative">
                <TransactionButton
                  type="button"
                  className={`
                 center !h-auto !w-72 !gap-2 rounded-full !px-7 !py-4 !text-xl font-normal transition-all
              `}
                  onClick={submit}
                >
                  <div className="flex-1">
                    {isTransacting ? "Transacting.." : "Publish Market"}
                  </div>
                  <div className={`${isTransacting && ""}`}>
                    <RiSendPlaneLine />
                  </div>
                </TransactionButton>
                <div className="absolute -bottom-8 left-[50%] translate-x-[-50%]">
                  {/* <div
                    className={`w-40 cursor-pointer text-center text-sm font-semibold underline ${
                      hasEnoughLiquidty ? "text-ztg-blue" : "text-vermilion"
                    }`}
                    onClick={() => setTotalCostIsOpen(true)}
                  >
                    View Cost Breakdown
                  </div> */}
                  <Modal
                    open={totalCostIsOpen}
                    onClose={() => setTotalCostIsOpen(false)}
                  >
                    <Dialog.Panel className="rounded-md bg-white p-8">
                      <h2 className="mb-4 text-lg">Cost Breakdown</h2>
                      <div className="mb-4">
                        {/* <div className="flex-1">
                          <h3 className="text-base font-normal text-black">
                            {editor.form.moderation} Bond
                          </h3>
                          <div className="flex items-center justify-start gap-6">
                            <h4 className="flex-1 text-sm font-light text-gray-500">
                              {editor.form.moderation === "Permissionless"
                                ? "Returned if the market isn't deleted by the committee."
                                : "Returned if the market is approved or ends before being approved by the committee."}
                            </h4>
                            <div className="flex self-end ">{bondCost} DHP</div>
                          </div>
                        </div> */}
                      </div>

                      <div className="mb-4 flex">
                        <div className="flex-1">
                          <h3 className="text-base font-normal text-black">
                            Oracle Bond
                          </h3>
                          <div className="flex items-center justify-start gap-6">
                            <h4 className="flex-1 text-sm font-light text-gray-500">
                              Returned if oracle reports the market outcome on
                              time.
                            </h4>
                            <div className="">{oracleBond} ZTG</div>
                          </div>
                        </div>
                      </div>

                      {/* {editor.form.moderation === "Permissionless" &&
                        editor.form.liquidity?.deploy && (
                          <div className="mb-4 mt-4 flex">
                            <div className="flex-1">
                              <h3 className="text-base font-normal text-black">
                                Liquidity
                              </h3>
                              <div className="flex items-center justify-start gap-6">
                                <h4 className="flex-1 text-sm font-light text-gray-500">
                                  Can be withdrawn at any time, will collect
                                  fees but subject to impermanent loss.
                                </h4>
                                <div className="">
                                  {new Decimal(
                                    editor.form.liquidity.amount || 0,
                                  ).toFixed(1)}{" "}
                                  {editor.form.currency}
                                </div>
                              </div>
                            </div>
                          </div>
                        )} */}

                      <div className="flex">
                        <div className="flex-1">
                          <h3 className="text-base font-normal text-black">
                            Transaction Fee
                          </h3>
                          <div className="flex items-center justify-start gap-6">
                            <h4 className="flex-1 text-sm font-light text-gray-500">
                              Returned if oracle reports the market outcome on
                              time.
                            </h4>
                            <div>
                              {formatNumberCompact(
                                feeDetails?.amount.toNumber() ?? 0,
                              )}{" "}
                              {feeDetails?.symbol}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mb-4 mt-8 flex border-t-1 pt-4">
                        <div className="flex-1">
                          <h3 className="text-base font-normal text-black">
                            Total
                          </h3>
                          <div className="flex justify-start gap-6">
                            <h4 className="flex-1 text-sm font-light text-gray-500">
                              Total cost for creating the market.
                            </h4>
                            <div className="center gap-1 font-semibold">
                              <div className="text-ztg-blue">
                                {ztgCost.toFixed(3)} DHP
                              </div>
                              {foreignCurrencyCost && (
                                <>
                                  <div> + </div>
                                  <div
                                    className={`text-${baseCurrencyMetadata?.twColor}`}
                                  >
                                    {0} {editor.form.currency}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {!hasEnoughLiquidty && (
                        <div className="flex-1">
                          <h3 className="text-base font-normal text-red-400">
                            Insufficient Balance
                          </h3>
                          <div className="flex justify-start gap-6">
                            <h4 className="flex-1 text-sm font-light text-gray-500">
                              Missing balance needed to create the market.
                            </h4>
                            <div className="center gap-1 font-semibold"></div>
                            {foreignCurrencyCost && (
                              <>
                                <div
                                  className={`text-${baseCurrencyMetadata?.twColor}`}
                                >
                                  {0} {editor.form.currency}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </Dialog.Panel>
                  </Modal>
                </div>
              </div>

              {editor.isWizard && (
                <div className="mt-14 flex justify-center md:mt-0">
                  <button
                    className={`
                    left-0 top-[50%] rounded-full border-2 border-gray-100 px-6 py-2 text-sm 
                    duration-200 ease-in-out active:scale-95 md:absolute md:translate-x-[-110%] md:translate-y-[-50%]
                    ${
                      firstInvalidStep &&
                      "border-orange-200 bg-white text-orange-500"
                    }
                  `}
                    onClick={() => {
                      // editor.goToSection(
                      //   firstInvalidStep?.label ?? "Liquidity",
                      // );
                      // window.scrollTo(0, 0);
                    }}
                    type="button"
                  >
                    {firstInvalidStep ? (
                      <div className="center gap-2">
                        {" "}
                        <LuFileWarning /> {`Fix ${firstInvalidStep?.label}`}
                      </div>
                    ) : (
                      "Go Back"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
