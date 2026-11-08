using System;
using System.Diagnostics;
using System.IO;

namespace PrintBroAgent
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.Title = "Print Bro - Automatic Hardware Print Spooler";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==============================================================");
            Console.WriteLine("    PRINT BRO - ZERO-TOUCH HARDWARE PRINT SPOOLER (.EXE)     ");
            Console.WriteLine("==============================================================");
            Console.ResetColor();
            Console.WriteLine();

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string agentScript = Path.Combine(appDir, "agent", "agent.js");
            if (!File.Exists(agentScript))
            {
                agentScript = Path.Combine(Environment.CurrentDirectory, "agent", "agent.js");
            }

            if (!File.Exists(agentScript))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[ERROR] Could not find agent/agent.js in: " + appDir);
                Console.ResetColor();
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
                return;
            }

            string combinedArgs = "\"" + agentScript + "\"";
            if (args != null && args.Length > 0)
            {
                combinedArgs += " " + string.Join(" ", args);
            }

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = "node.exe";
            psi.Arguments = combinedArgs;
            psi.UseShellExecute = false;

            try
            {
                Process proc = Process.Start(psi);
                if (proc != null)
                {
                    proc.WaitForExit();
                }
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("[NOTICE] Node.js is required to run the Print Bro desktop daemon.");
                Console.WriteLine("Details: " + ex.Message);
                Console.WriteLine();
                Console.WriteLine("Options:");
                Console.WriteLine("1. Install Node.js from https://nodejs.org");
                Console.WriteLine("2. Or open the 1-Link Web Dashboard in Chrome with zero installation!");
                Console.ResetColor();
                Console.WriteLine("\nPress any key to exit...");
                Console.ReadKey();
            }
        }
    }
}

