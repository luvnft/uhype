import Skeleton from "components/ui/Skeleton";
import Decimal from "decimal.js";
import { ZTG } from "lib/constants";
import { MarketOutcome, MarketOutcomes } from "lib/types/markets";
import { formatNumberCompact } from "lib/util/format-compact";
import { hasDatePassed } from "lib/util/hasDatePassed";
import Link from "next/link";
import { BarChart2, Droplet, Users } from "react-feather";
import ScalarPriceRange from "../ScalarPriceRange";
import MarketCardContext from "./context";
import { lookupAssetImagePath } from "lib/constants/foreign-asset";
import { useMarketCmsMetadata } from "lib/hooks/queries/cms/useMarketCmsMetadata";
import { useMarketImage } from "lib/hooks/useMarketImage";
import { isMarketImageBase64Encoded } from "lib/types/create-market";
import { isAbsoluteUrl } from "next/dist/shared/lib/utils";
import dynamic from "next/dynamic";
import Image from "next/image";
import { getCurrentPrediction } from "lib/util/assets";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Market } from "src/types";
const MarketFavoriteToggle = dynamic(() => import("../MarketFavoriteToggle"), {
  ssr: false,
});

export interface Category {
  name: string;
}

export interface Asset {
  price: number;
}

export interface MarketType {
  scalar: [number, number];
}

export type FullMarketFragment = Market & {
  categories?: Category[]; // Array of categories like "Sports"
  assets?: Asset[]; // Array of assets, each having a price
  outcomeAssets?: (Asset | null)[]; // Outcome assets, can be null or Asset
  marketType?: MarketType; // Scalar or categorical market type
  baseAsset?: Asset | null; // Base asset, could be null
  marketKey?: BN; // Identifier for the market
  pool?: any; // Placeholder for pool, type depends on implementation
  neoPool?: any; // Placeholder for neoPool, type depends on implementation
  scalarType?: string; // Type of scalar market (e.g., number)
  status?: string; // Status of the market (e.g., "Active")
  img?: string | null; // Image URL or null
  resolvedOutcome?: string | null; // Resolved outcome, can be null
};

export interface MarketCardProps {
  market: Market;
  liquidity?: string;
  numParticipants?: number;
  className?: string;
  disableLink?: boolean;
  size?: "medium" | "large";
}
const defaultMarket = {
  title: "",
  answers: [],
  pool: {},
  neoPool: {},
  scalarType: "",
  status: "",
  coverUrl: "",
  resolvedOutcome: "",
  categories: ["Sports"],
  assets: [],
  outcomeAssets: [],
  marketType: "",
  baseAsset: "",
};
export const MarketCard = ({
  market,
  liquidity = "1000",
  numParticipants = 10,
  className = "",
  disableLink = false,
  size = "medium",
}: MarketCardProps) => {
  console.log(market, "marketcard");
  const { marketKey, title, coverUrl, answers, publicKey } = market;
  const {
    pool,
    neoPool,
    scalarType,
    status,
    resolvedOutcome,
    categories,
    assets,
    outcomeAssets,
    marketType,
    baseAsset,
  } = defaultMarket;

  const isCategorical = answers?.length > 2;

  const marketCategories: MarketOutcomes =
    categories?.map((category, index) => {
      const asset = assets?.[index];

      const marketCategory: MarketOutcome = {
        name: category ?? "",
        assetId: String(outcomeAssets?.[index]) ?? "",
        price: 0,
      };

      return marketCategory;
    }) ?? [];

  const isYesNoMarket =
    marketCategories.length === 2 &&
    marketCategories.some((outcome) => outcome.name.toLowerCase() === "yes") &&
    marketCategories.some((outcome) => outcome.name.toLowerCase() === "no");

  const prediction = getCurrentPrediction(assets!, {
    marketType: { categorical: "yes" },
  });

  // Always show "Yes" prediction percentage
  const displayPrediction =
    isYesNoMarket === true && prediction?.name.toLowerCase() === "no"
      ? { price: 1 - prediction.price, name: "Yes" }
      : prediction;

  // const lower = marketType?.scalar?.[0]
  //   ? new Decimal(marketType?.scalar?.[0]).div(ZTG).toNumber()
  //   : 0;
  // const upper = marketType?.scalar?.[1]
  //   ? new Decimal(marketType?.scalar?.[1]).div(ZTG).toNumber()
  //   : 0;

  // const { data: image } = useMarketImage(market, {
  //   fallback:
  //     img && isAbsoluteUrl(img) && !isMarketImageBase64Encoded(img)
  //       ? img
  //       : undefined,
  // });

  // const { data: cmsMetadata } = useMarketCmsMetadata(marketKey);

  const img_Size = size === "medium" ? "32px" : "54px";

  return (
    <MarketCardContext.Provider value={{ baseAsset: "SOL" }}>
      <div
        data-testid={`marketCard-${marketKey}`}
        className={`ztg-transition group relative flex min-w-full flex-col rounded-[10px] bg-dark p-5 md:min-w-[calc(50%-8px)] md:hover:scale-[1.015] lg:min-w-[calc(100%/3-9.67px)] ${className}`}
      >
        <Link
          href={`/markets/${publicKey}`}
          onClick={(e) => {
            if (disableLink) {
              e.preventDefault();
              return;
            }
          }}
          className={`flex flex-1 flex-col gap-4 ${
            disableLink && "cursor-default"
          }`}
        >
          <div className="flex h-[54px] w-full gap-4 whitespace-normal">
            <div className="absolute right-4 top-4">
              <MarketFavoriteToggle marketId={marketKey?.toString()} />
            </div>
            <div className="relative min-h-[54px] min-w-[54px] rounded-lg bg-gray-400 bg-opacity-30">
              <Image
                priority
                alt={"Market image"}
                src={coverUrl}
                fill
                className="overflow-hidden rounded-lg"
                style={{
                  objectFit: "cover",
                  objectPosition: "50% 50%",
                }}
                sizes={img_Size}
              />
            </div>
            <h5 className="line-clamp-2 h-fit w-full pr-4 text-base duration-200">
              {title}
            </h5>
          </div>

          <div className="w-full">
            {status === "Resolved" && resolvedOutcome ? (
              <span className="text-xs text-ztg-blue">
                Resolved:{" "}
                <span className="font-semibold">
                  {isCategorical
                    ? marketCategories[resolvedOutcome].name
                    : formatNumberCompact(Number(resolvedOutcome) / ZTG)}
                </span>
              </span>
            ) : (pool || neoPool) && isCategorical ? (
              displayPrediction && (
                <MarketCardPredictionBar prediction={displayPrediction} />
              )
            ) : pool || neoPool ? (
              <ScalarPriceRange
                scalarType={(scalarType ?? "number") as "number" | "date"}
                lowerBound={0}
                upperBound={100}
                shortPrice={marketCategories[1]?.price}
                longPrice={marketCategories[0]?.price}
                status={String(status)}
              />
            ) : (
              <>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-gray-500">
                    No liquidity in this market
                  </span>
                  <span className="text-gray-500">
                    {0} - {100}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-lg bg-gray-200"></div>
              </>
            )}
          </div>
          <div className="flex flex-1 gap-2">
            <div className="flex-1">
              <MarketCardDetails
                market={market}
                numParticipants={numParticipants}
                liquidity={liquidity}
              />
            </div>
          </div>
        </Link>
      </div>
    </MarketCardContext.Provider>
  );
};

const MarketCardPredictionBar = ({
  prediction: { name, price },
}: {
  prediction: { name: string; price: number };
}) => {
  // check if market has liquidity
  if (price != null) {
    const impliedPercentage = Math.round(Number(price) * 100);

    return (
      <div className={`relative h-[30px] w-full bg-gray-200 transition-all`}>
        <div className="absolute flex h-full w-full items-center justify-between px-2.5 text-sm">
          <span className="line-clamp-1 text-blue">{name}</span>
          <span className="text-blue transition-all">{impliedPercentage}%</span>
        </div>
        <div
          className={`h-full bg-blue-lighter`}
          style={{
            width: `${isNaN(impliedPercentage) ? 0 : impliedPercentage}%`,
          }}
        />
      </div>
    );
  } else {
    return (
      <>
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-gray-500">No liquidity in this market</span>
          <span className="text-gray-500">0%</span>
        </div>
        <div className="h-1.5 w-full rounded-lg bg-dark"></div>
      </>
    );
  }
};

const MarketCardDetails = ({
  market,
  liquidity,
  numParticipants,
}: {
  market: FullMarketFragment;
  liquidity?: string;
  numParticipants?: number;
}) => {
  const { baseAsset, outcomeAssets } = market;
  const volume = new Decimal(Math.random() * 100).mul(
    outcomeAssets?.length ?? 0,
  );
  const period = {
    end: 1632384000000,
  };
  const isEnding = () => {
    const currentTime = new Date();
    const endTime = Number(period?.end);
    //6 hours in milliseconds
    const sixHours = 21600000;
    const diff = endTime - currentTime.getTime();
    //checks if event has passed and is within 6 hours
    return diff < sixHours && diff > 0 ? true : false;
  };
  const hasEnded = hasDatePassed(period?.end);
  const assetId = "SOL";
  const imagePath = lookupAssetImagePath(assetId);

  return (
    <div className="flex items-center text-xs">
      <div>
        <span>
          {period?.end &&
            `${hasEnded ? "Ended" : "Ends"} ${new Date(
              Number(period.end),
            ).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
            })}`}
        </span>
        {isEnding() && <span className="ml-1 text-red">Ends Soon</span>}
        <span className="ml-1 border-l-1 border-l-black pl-1 font-semibold ">
          {outcomeAssets?.length} outcomes{" "}
        </span>
      </div>
      <div className="ml-auto flex items-center justify-center gap-1.5">
        {numParticipants != undefined && baseAsset ? (
          <div className="flex items-center gap-0.5">
            <Users size={12} />
            <span>{formatNumberCompact(numParticipants, 2)}</span>
          </div>
        ) : (
          <Skeleton width={30} height={12} />
        )}
        <div className="flex items-center gap-1">
          <BarChart2 size={12} />
          <span>
            {/* {formatNumberCompact(new Decimal(volume).div(ZTG).toNumber(), 2)} */}
          </span>
        </div>
        {liquidity != undefined && baseAsset ? (
          <div className="flex items-center gap-1">
            <Droplet size={12} />
            <span>
              {formatNumberCompact(
                new Decimal(liquidity).div(ZTG).toNumber(),
                2,
              )}
            </span>
          </div>
        ) : (
          <Skeleton width={30} height={12} />
        )}
        <Image
          width={12}
          height={12}
          src={imagePath}
          alt="Currency token logo"
          className="rounded-full"
        />
      </div>
    </div>
  );
};

export default MarketCard;
