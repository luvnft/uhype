import { BN, Idl, IdlAccounts, Program } from "@coral-xyz/anchor";
import useAnchorProvider from "./useAnchorProvider";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, Keypair } from "@solana/web3.js";
import marketIDL from "../idl/dehype.json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemProgram } from "@solana/web3.js";
import {
  Answer,
  AnswerAccount,
  Market,
  MarketAccount,
  MarketResponse,
  MarketStats,
} from "src/types/index";
import { ComputeBudgetProgram, SendTransactionError } from "@solana/web3.js";
import { useNotifications } from "@/lib/state/notifications";
import { getExplorerUrl } from "@/lib/util";
export function useMarketProgram() {
  const provider = useAnchorProvider();
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();
  const program = new Program(
    marketIDL as Idl,
    "7fKSTrQLMk4K8svWTZ6dpD7mFVVfQdZ2TUb9MfqfAUWK",
    provider,
  );
  const queryClient = useQueryClient();
  const notificationStore = useNotifications();

  const createMarket = useMutation({
    mutationKey: ["createMarket"],
    mutationFn: async ({
      title,
      description,
      coverUrl,
      answers,
      creatorFeePercentage,
      serviceFeePercentage,
    }: {
      title: string;
      description: string;
      coverUrl: string;
      answers: string[];
      creatorFeePercentage: BN; // u64
      serviceFeePercentage: BN; // u64
    }) => {
      const marketKey = new BN(Math.floor(Math.random() * 10000));
      if (!publicKey) throw new Error("Wallet not connected");
      const [marketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), marketKey.toArrayLike(Buffer, "le", 8)],
        program.programId,
      );

      const [answerPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("answer"), marketKey.toArrayLike(Buffer, "le", 8)],
        program.programId,
      );

      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("market_vault"), marketKey.toArrayLike(Buffer, "le", 8)],
        program.programId,
      );

      // Create a transaction to increase compute units
      // Add the createMarket instruction to the transaction
      const transaction = await program.methods
        .createMarket(
          marketKey,
          title,
          description,
          coverUrl,
          answers,
          ["WIN", "LOSE"],
          [coverUrl, coverUrl],
          creatorFeePercentage,
        )
        .accounts({
          creator: publicKey,
          marketAccount: marketPDA,
          answerAccount: answerPDA,
          vaultAccount: vaultPDA,
          systemProgram: SystemProgram.programId,
        })
        .transaction(); // Use `instruction()` to get the instruction instead of transaction

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign the transaction with the wallet
      if (!signTransaction) {
        throw new Error(
          "Wallet not connected or signTransaction method is not available.",
        );
      }

      try {
        const signedTransaction = await signTransaction(transaction);

        const serializedTransaction = signedTransaction.serialize();
        const signature = await connection.sendRawTransaction(
          serializedTransaction,
        );
        await connection.confirmTransaction(signature, "confirmed");

        console.log("Transaction Signature:", signature);
        return { signature, marketPubkey: marketPDA };
      } catch (error) {
        if (error instanceof SendTransactionError) {
          // If the error is a SendTransactionError, get logs
          console.error("Transaction logs:", await error.getLogs(connection));
        }

        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getMarketAccounts"] });
    },
  });

  // const createMarket = useMutation({
  //   mutationKey: ["createMarket"],
  //   mutationFn: async ({
  //     eventName,
  //     outcomeOptions,
  //   }: {
  //     eventName: string;
  //     outcomeOptions: string[];
  //   }) => {
  //     if (!publicKey) return;
  //     const seed = new BN(randomBytes(8));

  //     const marketKeypair = Keypair.generate();

  //     const transaction = await program.methods
  //       .createMarket(eventName, outcomeOptions)
  //       .accounts({
  //         market: marketKeypair.publicKey,
  //         user: publicKey,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([marketKeypair])
  //       .transaction();

  //     // const [market] = PublicKey.findProgramAddressSync(
  //     //   [
  //     //     Buffer.from("market"),
  //     //     publicKey.toBuffer(),
  //     //     seed.toArrayLike(Buffer, "le", 8),
  //     //   ],
  //     //   program.programId,
  //     // );
  //     // console.log("Market PDA:", market.toBase58());
  //     // // Construct the transaction
  //     // const transaction = await program.methods
  //     //   .createMarket(eventName, outcomeOptions)
  //     //   .accounts({
  //     //     market,
  //     //     user: publicKey,
  //     //     systemProgram: SystemProgram.programId,
  //     //   })
  //     //   .transaction();

  //     const { blockhash } = await connection.getLatestBlockhash();
  //     transaction.recentBlockhash = blockhash;
  //     transaction.feePayer = publicKey;

  //     // Log the transaction details
  //     console.log("Transaction:", JSON.stringify(transaction));

  //     try {
  //       // Send the transaction using the wallet's sendTransaction method
  //       const signature = await sendTransaction(transaction, connection, {
  //         skipPreflight: true, // Skip preflight checks
  //         preflightCommitment: "confirmed", // Set preflight commitment level
  //       });

  //       console.log("Transaction Signature:", signature);
  //       return signature;
  //     } catch (error) {
  //       console.error("Transaction Error:", error);
  //       throw error;
  //     }
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ["getMarketAccounts"] });
  //   },
  // });

  const getMarkets = async (): Promise<Market[]> => {
    try {
      const responses =
        (await program.account.marketAccount.all()) as MarketResponse[];

      const marketsWithAnswers = await Promise.all(
        responses.map(async (market) => {
          const marketKey = market.account.marketKey;
          const answers = await getMarketAnswers(marketKey);
          return {
            ...market.account,
            publicKey: market.publicKey,
            answers: answers.answers as Answer[],
          };
        }),
      );
      return marketsWithAnswers;
    } catch (error) {
      console.error("Error fetching markets:", error);
      throw error;
    }
  };

  // Using useQuery for getMarkets
  const useGetMarketsQuery = () =>
    useQuery({
      queryKey: ["getMarkets"],
      queryFn: getMarkets,
    });

  // Original getMarket function
  const getMarket = async (marketPublicKey: PublicKey): Promise<Market> => {
    try {
      const marketAccount = (await program.account.marketAccount.fetch(
        marketPublicKey,
      )) as MarketAccount;
      console.log({ marketAccount });
      const answers = await getMarketAnswers(marketAccount.marketKey);
      console.log({ answers });

      return {
        publicKey: marketPublicKey,
        ...marketAccount,
        answers: answers.answers as Answer[],
      };
    } catch (error) {
      console.error("Error fetching market:", error);
      throw error;
    }
  };

  // Using useQuery for getMarket
  const useGetMarketQuery = (marketPublicKey?: PublicKey | string) => {
    if (!marketPublicKey) {
      return {
        data: undefined,
        isLoading: false,
        error: null,
      };
    }
    // Convert string to PublicKey if necessary
    const publicKey =
      typeof marketPublicKey === "string"
        ? new PublicKey(marketPublicKey)
        : marketPublicKey;

    return useQuery({
      queryKey: ["getMarket"],
      queryFn: () => getMarket(publicKey),
      enabled: !!publicKey, // Only run the query if the publicKey is available
    });
  };

  // const getMyMarketAccounts = async (): Promise<MarketAccount[]> => {
  //   if (!publicKey) {
  //     return []; // Return an empty array if publicKey is not defined
  //   }

  //   try {
  //     const responses = await program.account.marketAccount.all();
  //     // Filter or process accounts if needed
  //     // const myMarkets = responses.filter(account => account.account.owner.equals(publicKey));
  //     // return myMarkets;
  //   } catch (error) {
  //     console.error("Error fetching my markets:", error);
  //     throw error;
  //   }
  // };

  const resolveMarket = useMutation({
    mutationKey: ["resolveMarket"],
    mutationFn: async ({
      market,
      winningOutcome,
    }: {
      market: PublicKey;
      winningOutcome: string;
    }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      // Construct the transaction
      const transaction = await program.methods
        .resolveMarket(winningOutcome)
        .accounts({
          market,
          user: publicKey,
        })
        .transaction();

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign the transaction with the user's wallet
      if (!signTransaction) {
        throw new Error(
          "Wallet not connected or signTransaction method is not available.",
        );
      }

      const signedTransaction = await signTransaction(transaction);

      if (!signedTransaction) {
        throw new Error("Failed to sign the transaction with the wallet.");
      }

      try {
        // Serialize the signed transaction
        const serializedTransaction = signedTransaction.serialize();

        // Send the raw transaction to the Solana network
        const signature = await connection.sendRawTransaction(
          serializedTransaction,
        );

        // Confirm the transaction
        await connection.confirmTransaction(signature, "confirmed");

        console.log("Transaction Signature:", signature);
        return signature;
      } catch (error) {
        console.error("Transaction Error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getMarketAccounts"] });
    },
  });

  const answerPDA = (marketKey: BN): PublicKey => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("answer"), marketKey.toArrayLike(Buffer, "le", 8)],
      program.programId,
    )[0];
  };

  const getMarketAnswers = async (marketKey: BN) => {
    const answerPDAKey = answerPDA(marketKey); // Renamed to avoid conflict
    const answerData = await program.account.answerAccount.fetch(answerPDAKey);
    return answerData;
  };

  const placeBet = async ({
    voter,
    marketKey,
    betAmount,
    answerKey,
  }: {
    voter: PublicKey;
    marketKey: BN;
    betAmount: BN;
    answerKey: string;
  }): Promise<string> => {
    if (!publicKey) throw new Error("Wallet not connected");
    // Create the transaction to place the bet
    const transaction = await program.methods
      .bet(answerKey, betAmount)
      .accounts({
        voter: voter,
        marketAccount: PublicKey.findProgramAddressSync(
          [Buffer.from("market"), marketKey.toArrayLike(Buffer, "le", 8)],
          program.programId,
        )[0],
        vaultAccount: PublicKey.findProgramAddressSync(
          [Buffer.from("market_vault"), marketKey.toArrayLike(Buffer, "le", 8)],
          program.programId,
        )[0],
        answerAccount: PublicKey.findProgramAddressSync(
          [Buffer.from("answer"), marketKey.toArrayLike(Buffer, "le", 8)],
          program.programId,
        )[0],
        betAccount: PublicKey.findProgramAddressSync(
          [
            Buffer.from("betting"),
            voter.toBuffer(),
            marketKey.toArrayLike(Buffer, "le", 8),
            new BN(answerKey).toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        )[0],
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    // Sign the transaction
    if (!signTransaction) {
      throw new Error(
        "Wallet not connected or signTransaction method is not available.",
      );
    }

    const signedTransaction = await signTransaction(transaction);

    if (!signedTransaction) {
      throw new Error("Failed to sign the transaction with the wallet.");
    }

    try {
      // Serialize the signed transaction
      const serializedTransaction = signedTransaction.serialize();

      // Send the raw transaction to the Solana network
      const signature = await connection.sendRawTransaction(
        serializedTransaction,
      );

      // Confirm the transaction
      await connection.confirmTransaction(signature, "confirmed");

      console.log("Transaction Signature:", signature);
      return signature; // You might want to return the signature or the transaction
    } catch (error) {
      if (error instanceof SendTransactionError) {
        // If the error is a SendTransactionError, get logs
        console.error("Transaction logs:", await error.getLogs(connection));
      }

      console.error("Transaction Error:", error);
      throw error;
    }
  };

  // Mutation to use the placeBet function
  // Mutation to use the placeBet function
  const useMutateBet = useMutation({
    mutationKey: ["placeBet"],
    mutationFn: placeBet,
    onSuccess: (signature) => {
      console.log("onsuccess", signature);
      const explorerUrl = getExplorerUrl(signature, "devnet");
      notificationStore.pushNotification(
        <>
          Bet placed successfully! View the transaction on{" "}
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
        </>,
        {
          autoRemove: true,
          type: "Success",
          lifetime: 15,
        },
      );
      queryClient.invalidateQueries({ queryKey: ["getMarketAccounts"] });
    },
  });

  async function fetchMarketStats(marketKey: PublicKey) {
    // Fetch the MarketAccount

    const marketAccount = (await program.account.marketAccount.fetch(
      marketKey,
    )) as MarketAccount;

    const totalVolume = marketAccount.marketTotalTokens;

    // Fetch the AnswerAccount
    const [answerPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("answer"),
        marketAccount.marketKey.toArrayLike(Buffer, "le", 8),
      ],
      program.programId,
    );
    const answerAccount = (await program.account.answerAccount.fetch(
      answerPDA,
    )) as unknown as AnswerAccount;
    // Calculate percentages for each answer
    const answerStats = answerAccount.answers.map((answer) => {
      const percentage =
        (answer.answerTotalTokens.toNumber() / totalVolume.toNumber()) * 100;
      console.log(
        answer,
        { answerTotalTokens: answer.answerTotalTokens },
        { totalVolume: totalVolume.toString() },
        { percentage },
        "answer",
      );
      return {
        name: answer.name,
        totalTokens: answer.answerTotalTokens,
        totalVolume,
        percentage: percentage.toFixed(2),
      };
    });

    return {
      totalVolume: totalVolume.toNumber(),
      answerStats,
    };
  }

  const useMarketStats = (marketKey: PublicKey | undefined) => {
    return useQuery<MarketStats>(
      ["marketStats", marketKey?.toString()], // Query key, using optional chaining for marketKey
      () => fetchMarketStats(marketKey!), // Non-null assertion since it is guaranteed to be valid when the query runs
      {
        enabled: !!marketKey, // Query only runs if marketKey is valid
      },
    );
  };

  return {
    program,
    getMarket,
    createMarket,
    resolveMarket,
    getMarkets,
    useGetMarketsQuery,
    useGetMarketQuery,
    getMarketAnswers,
    answerPDA,
    mutateBet: useMutateBet.mutate,
    fetchMarketStats,
    useMarketStats,
  };
}

// old market
// const dep-createMarket = useMutation({
//   mutationKey: ["createMarket"],
//   mutationFn: async ({
//     eventName,
//     outcomeOptions,
//   }: {
//     eventName: string;
//     outcomeOptions: string[];
//   }) => {
//     if (!publicKey) throw new Error("Wallet not connected");

//     const seed = new BN(randomBytes(8)); // Generate a random seed

//     // Derive the PDA for the market
//     const [market] = PublicKey.findProgramAddressSync(
//       [
//         Buffer.from("market"),
//         publicKey.toBuffer(),
//         seed.toArrayLike(Buffer, "le", 8),
//       ],
//       program.programId,  // Ensure this program ID matches the on-chain program
//     );

//     console.log("Market PDA:", market.toBase58());

//     // Construct the transaction
//     const transaction = await program.methods
//       .createMarket(eventName, outcomeOptions)
//       .accounts({
//         market,  // PDA for the market
//         user: publicKey,
//         systemProgram: SystemProgram.programId, // System program
//       })
//       .transaction();

//     const { blockhash } = await connection.getLatestBlockhash();
//     transaction.recentBlockhash = blockhash;
//     transaction.feePayer = publicKey;

//     try {
//       const signature = await sendTransaction(transaction, connection, {
//         skipPreflight: true,
//         preflightCommitment: "confirmed",
//       });

//       console.log("Transaction Signature:", signature);

//       const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
//       console.log("View Transaction on Solana Explorer:", explorerUrl);

//       return signature;
//     } catch (error) {
//       console.error("Transaction Error:", error);
//       throw error;
//     }
//   },
//   onSuccess: () => {
//     queryClient.invalidateQueries({ queryKey: ["getMarketAccounts"] });
//   },
// });
