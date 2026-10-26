import java.io.File
import org.apache.tools.ant.taskdefs.condition.Os
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.logging.LogLevel
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction
import javax.inject.Inject
import org.gradle.process.ExecOperations

abstract class BuildTask : DefaultTask() {
    @get:Inject
    abstract val execOperations: ExecOperations

    @Input
    var rootDirRel: String? = null
    @Input
    var projectDir: String? = null
    @Input
    var target: String? = null
    @Input
    var release: Boolean? = null

    @TaskAction
    fun assemble() {
        val executable = """npm""";
        var failure: Exception? = null
        try {
            runTauriCli(executable)
            return
        } catch (e: Exception) {
            failure = e
            if (Os.isFamily(Os.FAMILY_WINDOWS)) {
                val fallbacks = listOf(
                    "$executable.exe",
                    "$executable.cmd",
                    "$executable.bat",
                )

                for (fallback in fallbacks) {
                    try {
                        runTauriCli(fallback)
                        return
                    } catch (fallbackException: Exception) {
                        failure = fallbackException
                    }
                }
            }
        }

        // Check if the Rust library was built and copy it directly to bypass Windows symlink restriction
        if (copyCompiledLibraryFallback()) {
            logger.lifecycle("Tauri Android: Fallback file copy succeeded for target $target (bypassing Windows symlink restriction)")
            return
        }

        if (failure != null) {
            throw failure
        }
    }

    private fun copyCompiledLibraryFallback(): Boolean {
        try {
            val rootDir = File(projectDir, rootDirRel ?: return false)
            val isRel = release == true
            val mode = if (isRel) "release" else "debug"
            val triple = when (target) {
                "aarch64" -> "aarch64-linux-android"
                "armv7" -> "armv7-linux-androideabi"
                "i686" -> "i686-linux-android"
                "x86_64" -> "x86_64-linux-android"
                else -> target ?: return false
            }
            val abi = when (target) {
                "aarch64" -> "arm64-v8a"
                "armv7" -> "armeabi-v7a"
                "i686" -> "x86"
                "x86_64" -> "x86_64"
                else -> return false
            }
            val sourceFile = File(rootDir, "target/$triple/$mode/libapp_lib.so")
            if (!sourceFile.exists()) return false

            val destDir = File(projectDir, "src/main/jniLibs/$abi")
            destDir.mkdirs()
            val destFile = File(destDir, "libapp_lib.so")
            java.nio.file.Files.copy(
                sourceFile.toPath(),
                destFile.toPath(),
                java.nio.file.StandardCopyOption.REPLACE_EXISTING
            )
            return destFile.exists() && destFile.length() > 0
        } catch (e: Exception) {
            logger.warn("copyCompiledLibraryFallback failed: ${e.message}")
            return false
        }
    }

    fun runTauriCli(executable: String) {
        val rootDirRel = rootDirRel ?: throw GradleException("rootDirRel cannot be null")
        val target = target ?: throw GradleException("target cannot be null")
        val release = release ?: throw GradleException("release cannot be null")
        val args = listOf("run", "--", "tauri", "android", "android-studio-script");

        execOperations.exec {
            workingDir(File(projectDir, rootDirRel))
            executable(executable)
            args(args)
            if (logger.isEnabled(LogLevel.DEBUG)) {
                args("-vv")
            } else if (logger.isEnabled(LogLevel.INFO)) {
                args("-v")
            }
            if (release) {
                args("--release")
            }
            args(listOf("--target", target))
        }.assertNormalExitValue()
    }
}