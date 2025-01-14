import { Transition } from "@headlessui/react";
import DiscordIcon from "components/icons/DiscordIcon";
import TwitterIcon from "components/icons/TwitterIcon";
import SettingsModal from "components/settings/SettingsModal";
import Avatar from "components/ui/Avatar";
import { useWallet } from "@solana/wallet-adapter-react";
import { shortenAddress } from "lib/util";
import { useState } from "react";
import { FaNetworkWired, FaUserCheck } from "react-icons/fa";
import Link from "next/link";
import { ExternalLink } from "react-feather";

const PortfolioIdentity = ({ address }: { address: string }) => {
  const { publicKey } = useWallet();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  let isOwned = false;

  return (
    <>
      <div className="mb-5 flex w-full flex-col justify-center gap-y-2 sm:gap-y-5">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div>{address && <Avatar address={address} size={100} />}</div>
          <div className="flex flex-col justify-center">
            <div className="mb-2 flex items-center gap-2">
              <div>
                {isOwned && (
                  <div className="text-xs font-extrabold text-gray-500">
                    wallet name
                  </div>
                )}
                {isOwned && (
                  <div className="text-xs font-extrabold text-gray-500">
                    on chain name
                  </div>
                )}
                <div className="text-xl font-extrabold sm:text-4xl"></div>
              </div>

              {isOwned && (
                <div className="flex flex-1 items-center justify-end">
                  <button
                    className="center gap-2 rounded-lg bg-ztg-blue px-3 py-2 text-sm text-white"
                    onClick={() => setShowSettingsModal(true)}
                  >
                    Set On-Chain Identity <FaUserCheck />
                  </button>
                </div>
              )}
            </div>
            <div className="hidden gap-4 text-sm sm:block md:text-base">
              <Link
                className="flex items-center gap-2 hover:text-ztg-blue"
                href={`https://solscan.io/account/${address}`}
                target="_blank"
              >
                <span>{address}</span>
                <ExternalLink className="flex-none" size={18} />
              </Link>
            </div>
            <div className="text-sm sm:hidden">
              <Link
                className="flex items-center gap-2 hover:text-ztg-blue"
                href={`https://solscan.io/account/${address}`}
                target="_blank"
              >
                <span> {shortenAddress(address, 12, 26)}</span>
                <ExternalLink className="flex-none" size={18} />
              </Link>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-white">
          {/* {identity?.twitter && (
            <a
              className="flex items-center rounded-md bg-twitter p-2"
              href={`https://twitter.com/${identity.twitter}`}
              target="_blank"
              rel="noreferrer"
            >
              <TwitterIcon fill="white" />
              <span className="ml-2.5 ">{identity.twitter}</span>
            </a>
          )} */}
          {/* {identity?.discord && (
            <div className="flex items-center rounded-md bg-discord p-2">
              <DiscordIcon fill="white" />
              <span className="ml-2.5">{identity.discord}</span>
            </div>
          )} */}
          {/* <Transition
            enter="transition-opacity duration-250"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-250"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            show={isProxying}
          >
            <div className="flex items-center gap-2 rounded-md bg-purple-600 p-2 text-white">
              <FaNetworkWired size={16} />
              Your are acting proxy for this account.
            </div>
          </Transition> */}
        </div>
      </div>
      <SettingsModal
        open={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false);
        }}
      />
    </>
  );
};

export default PortfolioIdentity;
